# Validation Summary: How to Benchmark EC2 Instance Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon Linux 2023
- Ubuntu
- sysbench
- stress-ng
- STREAM
- fio
- iperf3
- Amazon EBS
- EC2 Instance Metadata Service
- AWS Graviton

## Sources Consulted
- Amazon Linux 2023 package management documentation: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Amazon Linux 2023 RPM package list: https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- sysbench upstream README and installation documentation: https://github.com/akopytov/sysbench
- Ubuntu sysbench manpage: https://manpages.ubuntu.com/manpages/focal/man1/sysbench.1.html
- fio official documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- stress-ng Debian manpage: https://manpages.debian.org/bookworm/stress-ng/stress-ng.1.en.html
- iperf3 manual page: https://man.archlinux.org/man/iperf3.1.en
- Amazon EC2 instance network bandwidth documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html
- Amazon EC2 Instance Metadata Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Amazon EBS volume initialization documentation: https://docs.aws.amazon.com/ebs/latest/userguide/initalize-volume.html
- AWS Graviton performance testing whitepaper: https://docs.aws.amazon.com/whitepapers/latest/aws-graviton-performance-testing/what-is-aws-graviton.html
- Geekbench Linux download page: https://www.geekbench.com/download/linux/
- STREAM benchmark reference: https://www.cs.virginia.edu/stream/

## Issues Found
- The Amazon Linux 2023 install snippet used `yum install -y sysbench ...` and implied all tools were available from default AL2023 repositories. AL2023 uses DNF by default, with `yum` only retained as a pointer, and `sysbench` is not listed in the official AL2023 package list. Changed the snippet to use `dnf`, install the AL2023-packaged tools from the default repositories, and install `sysbench` from the upstream sysbench package repository.
- The fio "sequential read/write performance" examples used a 4KB block size. That command is syntactically valid, but it is a poor fit for measuring sequential throughput. Changed the sequential examples to use `--bs=1M`, while leaving the random I/O examples at 4KB.
- The combined benchmark script queried EC2 instance metadata without an IMDSv2 token. That can fail on instances where IMDSv2 is required. Updated the script to request an IMDSv2 token and pass it when retrieving the instance type.
- The Geekbench optional install snippet hardcoded Geekbench 6.3.0. The official Linux download page currently lists Geekbench 6.7.1, and the 6.7.1 tarball is available from the same CDN path pattern. Updated the snippet to 6.7.1.

## Review Notes
- The benchmark commands are syntactically valid for the referenced tools based on official documentation and manpages.
- The EBS warm-up recommendation applies to volumes created from snapshots or volume copies. Empty EBS volumes deliver maximum performance immediately and do not require initialization.
