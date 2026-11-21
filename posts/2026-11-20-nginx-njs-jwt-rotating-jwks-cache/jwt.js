// Restricted RS256 lab profile. Replace these deployment constants together.
const ISSUER = 'https://issuer.internal.example/';
const AUDIENCE = 'catalog-api';

function unpack(part) {
    if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('encoding');
    const bytes = Buffer.from(part, 'base64url');
    if (bytes.toString('base64url') !== part) throw new Error('encoding');
    return bytes;
}

function object(part) {
    const value = JSON.parse(unpack(part).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') {
        throw new Error('object');
    }
    return value;
}

async function authorize(r) {
    let infrastructure = false;
    try {
        const auth = r.headersIn.Authorization || '';
        if (auth.length > 8192 || !auth.startsWith('Bearer ')) throw new Error('bearer');
        const parts = auth.slice(7).split('.');
        if (parts.length !== 3) throw new Error('compact');
        const header = object(parts[0]);
        const claims = object(parts[1]);
        const signature = unpack(parts[2]);
        if (header.alg !== 'RS256' || header.typ !== 'JWT' ||
            typeof header.kid !== 'string' || header.kid.length < 1 ||
            header.kid.length > 128 ||
            Object.keys(header).some(k => !['alg', 'typ', 'kid'].includes(k))) {
            throw new Error('header');
        }
        infrastructure = true;
        const reply = await r.subrequest('/_jwks', {method: 'GET', body: ''});
        if (reply.status !== 200) throw new Error('keys unavailable');
        const set = JSON.parse(reply.responseText);
        if (!set || !Array.isArray(set.keys) || set.keys.length > 32) {
            throw new Error('key set');
        }
        const matches = set.keys.filter(k => k && k.kid === header.kid);
        infrastructure = false;
        if (matches.length !== 1) throw new Error('unknown or ambiguous key');
        const jwk = matches[0];
        if (jwk.kty !== 'RSA' || jwk.use !== 'sig' || jwk.alg !== 'RS256' ||
            typeof jwk.n !== 'string' || typeof jwk.e !== 'string' ||
            unpack(jwk.n).length < 256 || jwk.d !== undefined) {
            throw new Error('key profile');
        }
        const key = await crypto.subtle.importKey(
            'jwk', jwk,
            {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
        const valid = await crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5', key, signature,
            Buffer.from(parts[0] + '.' + parts[1]));
        if (!valid) throw new Error('signature');
        const now = Date.now() / 1000;
        if (claims.iss !== ISSUER || claims.aud !== AUDIENCE ||
            typeof claims.sub !== 'string' || !claims.sub ||
            typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) ||
            now >= claims.exp ||
            (claims.nbf !== undefined && (typeof claims.nbf !== 'number' ||
             !Number.isFinite(claims.nbf) || now < claims.nbf))) {
            throw new Error('claims');
        }
        return r.return(204);
    } catch (error) {
        if (!infrastructure) r.headersOut['WWW-Authenticate'] = 'Bearer';
        return r.return(infrastructure ? 503 : 401);
    }
}

export default {authorize};
