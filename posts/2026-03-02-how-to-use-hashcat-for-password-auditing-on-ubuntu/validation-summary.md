# Validation Summary: How to Use Hashcat for Password Auditing on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Hashcat (password recovery / hash cracking)
- Ubuntu (apt packaging, source build)
- NVIDIA CUDA toolkit / AMD ROCm (GPU acceleration)
- SecLists (wordlists, rockyou.txt)
- hashid (hash identification helper)
- Impacket secretsdump (NTLM hash extraction, referenced)
- Linux shadow file (sha512crypt hash format)
- NTLM / NetNTLMv2 (Windows Active Directory hash formats)

## Sources Consulted
- Hashcat official wiki — rule-based attacks: https://hashcat.net/wiki/doku.php?id=rule_based_attack
- Hashcat downloads page: https://hashcat.net/hashcat/
- Hashcat example hashes / hash mode numbers: https://hashcat.net/wiki/doku.php?id=example_hashes
- Hashcat mask attack documentation: https://hashcat.net/wiki/doku.php?id=mask_attack
- Hashcat combinator attack documentation: https://hashcat.net/wiki/doku.php?id=combinator_attack

## Issues Found

1. **Outdated hashcat version in source-build example.** The post referenced `hashcat-6.2.6.tar.gz`. The current stable release on hashcat.net is **v7.1.2** (released 2025-08-23). Updated the `wget` URL, the `tar xf` filename, and the `cd` directory to `hashcat-7.1.2`.

2. **Incorrect explanation of the `d` rule function in the combinator attack example.** The post used `-k 'd'` and commented that `d = append digit`. According to the official Hashcat rule-based attack documentation, the `d` function **duplicates the entire word** (e.g. `p@ssW0rd` → `p@ssW0rdp@ssW0rd`). To append a digit you use the `$X` function (e.g. `$1`). I changed the example to `-k '$1'` and updated the inline comments to accurately describe both rules (`u` = uppercase all letters, `$1` = append the digit '1'), preserving the original pedagogical intent of generating candidates like `Password1`.

## Review Notes

- Hash mode numbers listed in the post are all correct against the hashcat example-hashes reference: `0` (MD5), `100` (SHA1), `1400` (SHA2-256), `3200` (bcrypt), `1000` (NTLM), `5600` (NetNTLMv2), `1800` (sha512crypt). Note that hashcat 6.x/7.x renamed some labels (e.g. SHA-256 is now displayed as "SHA2-256"), but the numeric mode IDs are unchanged.
- Attack-mode numbers are correct: `-a 0` (straight/dictionary), `-a 1` (combinator), `-a 3` (brute-force / mask).
- Mask character placeholders (`?l`, `?u`, `?d`, `?s`, `?a`) are correct.
- Workload profiles `1`–`4` mapping (low / default / high / nightmare) is correct.
- Flags used (`--increment`, `--increment-min`, `--increment-max`, `--session`, `--restore`, `--runtime`, `--show`, `--force`, `-I`, `-w`, `-j`, `-k`, `-r`) all exist in hashcat and are used with correct syntax.
- The Ubuntu `seclists` apt package and the path `/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz` are correct for current Ubuntu releases.
- The default rules path `/usr/share/hashcat/rules/` and the referenced rule files (`best64.rule`, `dive.rule`, `toggles1.rule`, `rockyou-30000.rule`) are correct for the apt-installed package.
- The `nvidia-cuda-toolkit` apt package name is correct for Ubuntu.
- Future maintenance: when hashcat 8.x is released, the source-build snippet's version (now 7.1.2) will need another bump. Consider linking to https://hashcat.net/hashcat/ rather than pinning a version to reduce drift.
- Pedagogical note (not a correctness issue): `nvidia-cuda-toolkit` from Ubuntu's repos can lag behind upstream CUDA; users with newer NVIDIA GPUs may need to install CUDA directly from NVIDIA's `.deb` repos for best performance.
