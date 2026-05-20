# Validation Summary: How to Encrypt Files and Directories with age on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- age CLI
- age-keygen
- age passphrase encryption
- age public key and SSH recipient encryption
- tar, gzip, pg_dump, rsync, and shell scripting
- rage Rust implementation

## Sources Consulted
- age official repository and README: https://github.com/FiloSottile/age
- age official CLI manual: https://raw.githubusercontent.com/FiloSottile/age/main/doc/age.1.ronn
- age-keygen official manual: https://raw.githubusercontent.com/FiloSottile/age/main/doc/age-keygen.1.ronn
- age official releases: https://github.com/FiloSottile/age/releases
- rage official repository and releases: https://github.com/str4d/rage

## Issues Found
- The post attributed age only to Filippo Valsorda. Updated it to credit both Ben Cartwright-Cox and Filippo Valsorda, matching the official project documentation.
- The GitHub binary download example hardcoded age v1.1.1, while the current official release is v1.3.1. Updated the command to use the official latest binary download endpoint.
- The non-interactive passphrase section incorrectly implied passphrases could be supplied from a file or stdin. Updated it to state that passphrase mode is intentionally interactive and that key pairs are the recommended scripting approach.
- The key-pair section described age only as X25519. Updated it to mention age 1.3.0+ post-quantum hybrid X25519 + ML-KEM-768 keys via `age-keygen -pq`.
- The key-generation example wrote to `~/.config/age/identity.txt` without creating the directory first. Added `mkdir -p ~/.config/age`.
- Several command examples used truncated recipient placeholders that would fail if copied literally. Replaced them with the full example recipient used elsewhere in the post.
- The GitHub SSH key example used `--recipient -`, which is invalid for reading recipients from stdin. Changed it to `--recipients-file -`.
- The SSH public key example used a truncated key literal. Changed it to read an existing public key file with `$(cat ~/.ssh/id_ed25519.pub)`.
- The rage installation example used a non-existent latest-release asset name. Replaced it with `cargo install rage`.
- The key rotation script assigned quoted `~` paths, which would not expand in shell variables. Replaced them with `$HOME` paths and added a guard for the no-`.age`-files case.

## Review Notes
The main age examples now match the current official CLI syntax. Ubuntu package repositories may still provide an older age release than the upstream latest binary; users who need age 1.3.0+ features such as native post-quantum identities should use an upstream binary or Go installation method.
