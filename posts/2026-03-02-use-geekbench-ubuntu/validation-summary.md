# Validation Summary: How to Use Geekbench on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Geekbench 6 (CPU benchmark by Primate Labs)
- Geekbench 5 (legacy benchmark)
- Ubuntu / Linux
- Bash scripting
- cpufrequtils (CPU governor management)
- lm-sensors (CPU temperature monitoring)

## Sources Consulted
- Geekbench 6 Command Line Tool documentation: https://support.primatelabs.com/kb/geekbench/geekbench-6-command-line-tool
- Geekbench 6 release notes: https://www.primatelabs.com/release/geekbench6/
- Geekbench 6 CPU Workloads PDF: https://www.geekbench.com/doc/geekbench6-cpu-workloads.pdf
- Geekbench 6 Benchmark Internals PDF: https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf
- Primate Labs blog "Introducing Geekbench 6" (Feb 2023)
- Installing Geekbench 5 on Linux KB: https://support.primatelabs.com/kb/geekbench/installing-geekbench-5-on-linux

## Issues Found

1. **Incorrect Geekbench 6 baseline system**: The post originally stated the baseline was an "Apple Mac mini (2023, M2)". Per Primate Labs' official documentation, Geekbench 6's baseline score of 2500 is calibrated against a **Dell Precision 3460 with an Intel Core i7-12700**. Fixed.

2. **Incorrect extracted directory name for Geekbench 6**: The post used `sudo mv "Geekbench ${GB_VERSION}" /opt/geekbench` (with a space). The actual extracted directory from `Geekbench-6.X.X-Linux.tar.gz` is `Geekbench-6.X.X-Linux` (hyphenated). Fixed to `sudo mv "Geekbench-${GB_VERSION}-Linux" /opt/geekbench`.

3. **Incorrect extracted directory name for Geekbench 5**: The post used `cd "Geekbench 5.5.1 Linux"`. The actual extracted directory is `Geekbench-5.5.1-Linux` (hyphenated). Fixed.

4. **Workload name inaccuracies**: Two workloads used informal names instead of the official Primate Labs names. Changed "HTML5" → "HTML5 Browser" and "PDF Rendering" → "PDF Renderer" to match official documentation.

## Review Notes

- The pinned version `GB_VERSION="6.3.0"` will become outdated as Primate Labs releases new Geekbench 6 point releases. The post does include a helpful instruction to "Check https://www.geekbench.com/download/linux/ for the current version", which mitigates this.
- CLI flags (`--no-upload`, `--save`, `--export-json`, `--help`) are all verified valid against the Geekbench 6 CLI documentation.
- The workload categories listed are complete and accurate for Geekbench 6 CPU benchmark (after the naming fixes).
- The download URL pattern `https://cdn.geekbench.com/Geekbench-${VERSION}-Linux.tar.gz` is correct.
- Score ranges given for various CPU classes are reasonable approximations and useful for orientation, though specific numbers will vary by exact CPU model.
- The cpufreq-set commands and procedure for setting CPU governor are correct for Ubuntu with cpufrequtils installed.
