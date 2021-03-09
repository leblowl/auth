import { InitialContext, Connection } from '@/connection'
import { getDeviceId } from '@/device'
import { KeyType } from '@/keyset'
import { UserStuff } from './setup'

// HELPERS

export const tryToConnect = async (a: UserStuff, b: UserStuff) => {
  const aConn = (a.connection[b.userName] = new Connection({ context: a.context }).start())
  const bConn = (b.connection[a.userName] = new Connection({ context: b.context }).start())

  aConn.stream.pipe(bConn.stream).pipe(aConn.stream)
}

/** Connects the two members and waits for them to be connected */
export const connect = async (a: UserStuff, b: UserStuff) => {
  tryToConnect(a, b)
  return connection(a, b)
}

/** Connects a (a member) with b (invited using the given seed). */
export const connectWithInvitation = async (a: UserStuff, b: UserStuff, seed: string) => {
  b.context = {
    user: b.user,
    device: b.device,
    invitee: { type: KeyType.MEMBER, name: b.userName },
    invitationSeed: seed,
  }
  return connect(a, b).then(() => {
    // The connection now has the team object, so let's update our user stuff
    b.team = b.connection[a.userName].team!
  })
}

export const connectPhoneWithInvitation = async (a: UserStuff, seed: string) => {
  const phoneContext = {
    device: a.phone,
    invitee: { type: KeyType.DEVICE, name: getDeviceId(a.phone) },
    invitationSeed: seed,
  } as InitialContext

  const laptop = new Connection({ context: a.context }).start()
  const phone = new Connection({ context: phoneContext }).start()

  laptop.stream.pipe(phone.stream).pipe(laptop.stream)

  await all([laptop, phone], 'connected').then(() => {
    a.team = laptop.team!
  })
}

/** Passes if each of the given members is on the team, and knows every other member on the team */
export const expectEveryoneToKnowEveryone = (...members: UserStuff[]) => {
  for (const a of members)
    for (const b of members) //
      expect(a.team.has(b.userName)).toBe(true)
}

/** Disconnects the two members and waits for them to be disconnected */
export const disconnect = (a: UserStuff, b: UserStuff) =>
  Promise.all([
    disconnection(a, b),
    a.connection[b.userName].stop(),
    b.connection[a.userName].stop(),
  ])

// PROMISIFIED EVENTS
export const connection = async (a: UserStuff, b: UserStuff) => {
  const connections = [a.connection[b.userName], b.connection[a.userName]]

  // ✅ They're both connected
  await all(connections, 'connected')

  const sharedKey = connections[0].sessionKey
  connections.forEach(connection => {
    expect(connection.state).toEqual('connected')
    // ✅ They've converged on a shared secret key
    expect(connection.sessionKey).toEqual(sharedKey)
  })
}

export const updated = (a: UserStuff, b: UserStuff) => {
  const connections = [a.connection[b.userName], b.connection[a.userName]]
  return all(connections, 'updated')
}

export const disconnection = async (a: UserStuff, b: UserStuff, message?: string) => {
  const connections = [a.connection[b.userName], b.connection[a.userName]]
  const activeConnections = connections.filter(c => c.state !== 'disconnected')

  // ✅ They're both disconnected
  await all(activeConnections, 'disconnected')

  activeConnections.forEach(connection => {
    expect(connection.state).toEqual('disconnected')
    // ✅ If we're checking for a message, it matches
    if (message !== undefined) expect(connection.error!.message).toContain(message)
  })
}

export const all = (connections: Connection[], event: string) =>
  Promise.all(
    connections.map(connection => {
      if (event === 'disconnect' && connection.state === 'disconnected') return true
      if (event === 'connected' && connection.state === 'connected') return true
      else return new Promise(resolve => connection.on(event, () => resolve(true)))
    })
  )
