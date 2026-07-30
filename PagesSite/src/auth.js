// Credentials are stored as SHA-256 hashes — never as plaintext.
// Default: username = Bobathon_Thrivent  /  password = MainframeIBM1!
// To change: run `node -e "require('crypto').createHash('sha256').update('yourvalue').digest('hex') |> console.log"` and replace the hashes below.
// Then redeploy. Optionally set VITE_USERNAME_HASH and VITE_PASSWORD_HASH as GitHub repo secrets and
// reference them in vite.config.js define{} to avoid committing hashes to source.

export const USERNAME_HASH = import.meta.env.VITE_USERNAME_HASH ||
  'c7d79b327bf2c54dcb5c563be81d662f4d557c42e6295137ebb38c7d53208664'

export const PASSWORD_HASH = import.meta.env.VITE_PASSWORD_HASH ||
  '0e1271fc8aa7a3d7475c9195010535ad3f84db9ea4b49c3f27ac29f7ae392f71'

const SESSION_KEY = 'bob-lab-auth'

export async function sha256(str) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  )
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function checkCredentials(username, password) {
  const [uHash, pHash] = await Promise.all([sha256(username), sha256(password)])
  return uHash === USERNAME_HASH && pHash === PASSWORD_HASH
}

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export function setAuthenticated() {
  sessionStorage.setItem(SESSION_KEY, 'true')
}

export function clearAuthenticated() {
  sessionStorage.removeItem(SESSION_KEY)
}
