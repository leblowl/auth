import { NetworkAdapter, type RepoMessage } from '@automerge/automerge-repo'
import { eventPromise } from '@localfirst/auth-shared'

/**
 * An AuthenticatedNetworkAdapter is a NetworkAdapter that wraps another NetworkAdapter and
 * transforms outbound messages.
 */
export class AuthenticatedNetworkAdapter<T extends NetworkAdapter> //
  extends NetworkAdapter
{
  connect: typeof NetworkAdapter.prototype.connect
  disconnect: typeof NetworkAdapter.prototype.disconnect

  #isReady = false

  send = (msg: RepoMessage) => {
    this.sendFn(msg)
  }

  /**
   * The AuthProvider wraps a NetworkAdapter
   * @param baseAdapter
   * @param send
   */
  constructor(
    public baseAdapter: T,
    private readonly sendFn: (msg: RepoMessage) => void
  ) {
    super()

    // pass through the base adapter's connect & disconnect methods
    this.connect = this.baseAdapter.connect.bind(this.baseAdapter)
    this.disconnect = this.baseAdapter.disconnect.bind(this.baseAdapter)

    baseAdapter.on('ready', () => {
      this.#isReady = true
    })
  }
}
