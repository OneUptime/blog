# How to Benchmark System Performance with Phoronix Test Suite on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Benchmarking

Description: Step-by-step guide on benchmark system performance with phoronix test suite on rhel 9 with practical examples and commands.

---

The Phoronix Test Suite provides comprehensive system benchmarking on RHEL 9 with standardized, reproducible tests.

## Install Phoronix Test Suite

```bash
sudo dnf install -y php-cli php-xml php-json
wget https://phoronixtest-suite.com/releases/repo/pts.debian/files/phoronix-test-suite_10.8.4_all.deb
# Or install from source
git clone https://github.com/phoronix-test-suite/phoronix-test-suite.git
cd phoronix-test-suite
sudo ./install-sh
```

## List Available Tests

```bash
phoronix-test-suite list-available-tests
phoronix-test-suite info pts/compress-7zip
```

## Run Individual Tests

```bash
# CPU benchmark
phoronix-test-suite benchmark pts/compress-7zip

# Memory benchmark
phoronix-test-suite benchmark pts/ramspeed

# Disk benchmark
phoronix-test-suite benchmark pts/fio
```

## Run a Test Suite

```bash
# Complete system benchmark
phoronix-test-suite benchmark pts/system

# Server-focused tests
phoronix-test-suite benchmark pts/server
```

## Compare Results

```bash
phoronix-test-suite result-file-to-text results.txt
```

## Upload Results

```bash
phoronix-test-suite upload-result results
```

## Conclusion

The Phoronix Test Suite on RHEL 9 provides standardized benchmarks for comparing systems. Use it for hardware evaluation, pre-purchase testing, and tracking performance over time.

