# Validation Summary: How to Evaluate RHEL Performance on AWS Graviton ARM Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2
- AWS Graviton / Arm64 / AArch64
- AWS CLI
- sysbench
- fio
- iperf3
- nginx
- ApacheBench

## Sources Consulted
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: describe-images - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services - https://access.redhat.com/solutions/15356
- AWS EC2 M7g instance type documentation - https://aws.amazon.com/ec2/instance-types/m7g/
- AWS EC2 instance types documentation - https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-types.html
- AWS Graviton performance testing whitepaper - https://docs.aws.amazon.com/whitepapers/latest/aws-graviton-performance-testing/what-is-aws-graviton.html
- AWS RHEL pricing page - https://aws.amazon.com/partners/redhat/rhel-pricing/
- Red Hat RHEL 9 documentation: Developing C and C++ applications - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/developing_c_and_cpp_applications_in_rhel_9/developing_c_and_cpp_applications_in_rhel_9
- Red Hat RHEL 9 package manifest - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/index
- sysbench upstream README - https://github.com/akopytov/sysbench
- fio documentation - https://fio.readthedocs.io/en/master/fio_doc.html
- iPerf project documentation - https://iperf.fr/
- ApacheBench documentation - https://httpd.apache.org/docs/current/en/programs/ab.html

## Issues Found
- The RHEL AMI lookup filtered AMI names with `RHEL-9*arm64*`, which is less reliable than using the EC2 `architecture` filter. Updated it to filter by `Name=architecture,Values=arm64` and `Name=state,Values=available` while preserving the Red Hat owner ID.
- The sysbench installation command assumed `sysbench` is available from the enabled RHEL repositories. Added the upstream sysbench RPM repository setup recommended by the sysbench project before installing it.
- The tool installation command included `stress-ng`, but the post does not use it and it is not necessary for the listed benchmark commands. Removed it to avoid a package availability failure on fresh RHEL installations.
- The DNF package group command used `dnf groupinstall`; changed it to the documented `dnf group install` form.
- The cost-performance example used EC2 Linux compute rates in a RHEL-focused post without accounting for RHEL's current vCPU-based OS charge. Updated the example comments to explicitly include current regional EC2 compute pricing and RHEL OS pricing.
- The application benchmark used `ab` but only installed `nginx`; on RHEL the ApacheBench command is provided by `httpd-tools`. Added `httpd-tools` to the install command.

## Review Notes
- The benchmark commands for `sysbench`, `fio`, `iperf3`, and `ab` use valid current options. Results remain workload-specific and should be repeated on same-size ARM and x86 instances in the same region and under similar storage/network conditions.
