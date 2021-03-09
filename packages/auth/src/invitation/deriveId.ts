﻿import { hash, stretch, base64 } from '@herbcaudill/crypto'
import { HashPurpose } from '@/util'

export function deriveId(seed: string, name: string) {
  // ## Step 1b
  // The iKey is stretched using `scrypt` to discourage brute-force attacks (docs refer to this as
  // the `siKey`)
  const stretchedKey = stretch(`${seed}:${name}`)

  // ## Step 1c
  // The invitation id is derived from the stretched iKey, so Bob can generate it independently.
  // This will be visible in the signature chain and serves to uniquely identify the invitation.
  // (Keybase docs: `inviteID`)
  return base64.encode(hash(HashPurpose.INVITATION, stretchedKey)).slice(0, 15)
}
