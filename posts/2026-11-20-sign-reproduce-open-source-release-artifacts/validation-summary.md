# Validation summary

Python 3.11.13 produced identical ZIP bytes from two local directories with different source mtimes and permissions. ZIP entry names and timestamps matched expectations. Existing output, output within source and symbolic-link input were rejected. OpenSSL 4.1.0 generated a throwaway RSA 3072 key and verified the original archive signature; changed bytes failed verification. DER public-key hashing matched Python SHA-256. Five shell examples pass syntax checking and published Python matches the executed code. Mermaid structure was checked, not rendered. The generated social image was visually inspected and is readable without clipping.

Tests demonstrate bounded local packaging reproducibility and signature behavior. They do not establish independent third-party reproduction, native binary reproducibility, secure production signing, key distribution or release publication. The private lab key was not published or added to the article folder.

## Checked sources

- https://reproducible-builds.org/docs/definition/
- https://reproducible-builds.org/docs/archives/
- https://docs.python.org/3.11/library/zipfile.html
- https://reproducible-builds.org/docs/source-date-epoch/
- https://docs.openssl.org/4.1/man1/openssl-genpkey/
- https://docs.openssl.org/4.1/man1/openssl-pkey/
- https://docs.openssl.org/4.1/man1/openssl-dgst/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
