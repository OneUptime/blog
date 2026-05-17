# Validation Summary: How to Use openssl for Cryptographic Operations on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenSSL 3.x command-line tool (`openssl`)
- Symmetric encryption: AES-256-CBC, AES-256-CTR
- Asymmetric encryption: RSA (`genrsa`, `rsa`, `pkeyutl`)
- Elliptic-curve keys: `ecparam`, `ec` (P-256 / prime256v1, P-384 / secp384r1)
- X.509 certificates: `req`, `x509`, self-signed certs, CSRs, SAN extensions
- PKI: simple CA setup, signing CSRs
- Hash / MAC: `dgst` (SHA-256, SHA-512, MD5, HMAC), `rand`
- TLS inspection: `s_client` (including `-tls1_2`, `-tls1_3`, `-cipher`, `-showcerts`)
- Format conversion: PEM ↔ DER, PKCS#12
- Bash scripting (hybrid encrypt/decrypt, CA bootstrap)
- Ubuntu

## Sources Consulted
- OpenSSL 3.0 manual pages — `openssl-enc(1)`, `openssl-pkeyutl(1)`, `openssl-rsautl(1)`, `openssl-genrsa(1)`, `openssl-ecparam(1)`, `openssl-req(1)`, `openssl-x509(1)`, `openssl-s_client(1)`, `openssl-dgst(1)`, `openssl-pkcs12(1)` (https://docs.openssl.org/3.0/man1/)
- OpenSSL 3.0 migration guide — `openssl-migration(7)` (deprecations of `rsautl`, behavior of `enc` with AEAD)
- Live verification against locally installed OpenSSL 3.0.13 on Ubuntu (confirmed `enc -aes-256-gcm` errors with "AEAD ciphers not supported", confirmed `rsautl` deprecation message, confirmed `-pass file:` only reads the first line, confirmed `pkeyutl` is a drop-in replacement, confirmed round-trip of the corrected hybrid script)

## Issues Found

1. **`openssl enc -aes-256-gcm` does not work.** The `enc` utility explicitly rejects AEAD ciphers ("AEAD ciphers not supported" — exit 1). The post both recommended GCM as a preferred mode *and* showed a command that fails on every modern OpenSSL. **Fix:** updated the intro paragraph to note that `enc` does not support GCM/CCM, and replaced the GCM example with an AES-256-CTR example that actually runs.

2. **`openssl rsautl` is deprecated in OpenSSL 3.0** in favour of `pkeyutl`. While `rsautl` still functions, it prints a deprecation warning and could be removed in a future release. **Fix:** replaced both `rsautl` examples in the "RSA Asymmetric Encryption" section and both invocations inside the hybrid encrypt/decrypt scripts with the equivalent `pkeyutl` form, and added a one-sentence note about the deprecation.

3. **Hybrid encryption script silently corrupts ~12 % of session keys.** The script wrote 32 raw random bytes to `session.key` and then passed it via `-pass file:`. Per `openssl-passphrase-options(1)`, `-pass file:` reads *only the first line* of the file. Any 0x0A byte in the random data (≈ 12 % probability per byte, ≈ 100 % over 32 bytes overall, but breaking depending on position) would make the encrypted file undecryptable. **Fix:** changed the random generation to `openssl rand -base64 32 > session.key`, which produces a single base64 line that survives the "first line only" semantics intact. Verified end-to-end round-trip locally.

## Review Notes
- The `s_client` examples connect without `-servername`. Modern OpenSSL 3.x sends SNI automatically based on the `-connect` host, so the commands work for most servers, but adding `-servername example.com` would be more explicit and necessary on older builds. Left as-is since the commands work on current OpenSSL.
- `genrsa`, `ecparam -genkey`, and `rsa -pubout` still work but `openssl genpkey` / `openssl pkey` are the more modern interfaces. The shown commands remain fully supported in OpenSSL 3.x and produce correct output, so they were left as-is.
- The `-pbkdf2` note is accurate; without it OpenSSL falls back to the legacy EVP_BytesToKey derivation which is weak by modern standards.
- The "Building a Simple CA" example bootstraps the bare minimum (serial, index.txt, key, self-signed cert) but does not write an `openssl.cnf` with `[ ca ]` policy, so it would only be usable for ad-hoc `openssl x509 -req -CA …` signing (which is the pattern shown earlier). This is consistent and correct for the post's scope.
