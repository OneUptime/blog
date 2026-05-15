# Validation Summary: How to Configure RHEL for AWS Nitro Enclaves

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2
- AWS Nitro Enclaves
- AWS Nitro Enclaves CLI
- Docker
- Linux vsock sockets
- Python
- AWS KMS integration concepts

## Sources Consulted
- AWS Nitro Enclaves - What is Nitro Enclaves?: https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html
- AWS Nitro Enclaves - Install the Nitro Enclaves CLI on Linux: https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-cli-install.html
- AWS Nitro Enclaves CLI GitHub repository and RHEL source install notes: https://github.com/aws/aws-nitro-enclaves-cli
- AWS Nitro Enclaves - Creating an enclave: https://docs.aws.amazon.com/enclaves/latest/user/create-enclave.html
- AWS Nitro Enclaves CLI - build-enclave: https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-build-enclave.html
- AWS Nitro Enclaves CLI - run-enclave: https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-run-enclave.html
- AWS Nitro Enclaves CLI - console: https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-console.html
- AWS CLI run-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Docker Engine install on RHEL: https://docs.docker.com/engine/install/rhel/

## Issues Found
- The original RHEL setup used `sudo dnf install aws-nitro-enclaves-cli aws-nitro-enclaves-cli-devel`, but AWS documents those package commands for Amazon Linux, while the Nitro CLI repository points RHEL users to source installation. I changed the RHEL setup to install Docker and build/install the Nitro Enclaves CLI from the AWS GitHub repository.
- The Docker dependency was missing even though `docker build` is used later and Nitro CLI source builds use Docker. I added the Docker Engine repository, package installation, service startup, and `docker` group membership using Docker's RHEL documentation.
- The allocator service commands omitted the `.service` suffix used in AWS documentation. I updated the systemd commands to `nitro-enclaves-allocator.service`.
- The architecture diagram implied the enclave could reach AWS KMS directly. I changed it to show the KMS SDK client communicating over vsock to the KMS proxy on the parent instance, which then reaches AWS KMS.
- The guide used `nitro-cli console` after launching the enclave without `--debug-mode`. AWS documents that console access works only for enclaves launched in debug mode. I added `--debug-mode` to the test launch command and noted that it is for testing.
- The EC2 launch example omitted `--count 1`. I added it to match the AWS Nitro Enclaves launch example and make the intended instance count explicit.

## Review Notes
- I did not run the Nitro CLI workflow because it requires a Nitro Enclaves-enabled EC2 parent instance. The reviewed commands and options were checked against official AWS and Docker documentation.
- The sample app demonstrates local vsock communication only; it does not implement KMS attestation or KMS decrypt calls.
- Debug-mode enclaves are useful for console troubleshooting, but production enclaves should omit `--debug-mode` because debug-mode attestation PCRs are not suitable for cryptographic attestation.
