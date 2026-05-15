# Validation Summary: How to Benchmark System Performance with Phoronix Test Suite on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF
- PHP CLI and PHP extensions
- Phoronix Test Suite
- OpenBenchmarking.org
- System benchmarking

## Sources Consulted
- Phoronix Test Suite README: https://github.com/phoronix-test-suite/phoronix-test-suite
- Phoronix Test Suite client documentation: https://github.com/phoronix-test-suite/phoronix-test-suite/blob/master/documentation/phoronix-test-suite.md
- Phoronix Test Suite 10.8.4 release tarball URL: https://phoronix-test-suite.com/releases/phoronix-test-suite-10.8.4.tar.gz
- OpenBenchmarking.org pts/compress-7zip profile: https://openbenchmarking.org/test/pts/compress-7zip
- OpenBenchmarking.org pts/build-linux-kernel profile: https://openbenchmarking.org/test/pts/build-linux-kernel
- OpenBenchmarking.org pts/ramspeed profile: https://openbenchmarking.org/test/pts/ramspeed
- OpenBenchmarking.org pts/cpu suite: https://openbenchmarking.org/suite/pts/cpu
- OpenBenchmarking.org pts/disk suite: https://openbenchmarking.org/suite/pts/disk
- OpenBenchmarking.org pts/system suite: https://openbenchmarking.org/suite/pts/system
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf

## Issues Found
- The introduction said Phoronix Test Suite provides over 500 test profiles. Upstream documentation now describes more than 600 individual/default test profiles, so the count was updated to "over 600."
- The dependency command installed `php-json`, but current PTS documentation calls out PHP DOM and ZIP support for XML operations and OpenBenchmarking.org test profiles/suites. On RHEL, `php-xml` provides DOM and `php-pecl-zip` provides ZIP support, so the command was updated to use `php-pecl-zip`.
- The install comment said to download the "latest" Phoronix Test Suite while the command pinned the available 10.8.4 tarball. The comment was changed to say "Phoronix Test Suite 10.8.4" to avoid a stale/latest-version claim.

## Review Notes
The PTS subcommands used in the post are documented and current, including `list-available-suites`, `list-available-tests`, `search`, `benchmark`, `batch-setup`, `batch-benchmark`, `list-saved-results`, `result-file-to-text`, and `merge-results`. The referenced OpenBenchmarking.org test profiles and suites are valid. The `pts/cpu` suite is valid but marked deprecated upstream because it is broad; a future revision could suggest narrower CPU suites, but the command remains usable.
