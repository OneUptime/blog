# Validation Summary: How to Use AWS Nitro Enclaves for Sensitive Data Processing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Nitro Enclaves
- Amazon EC2
- AWS Nitro Enclaves CLI
- AWS KMS attestation condition keys
- Linux vsock sockets
- Python
- Docker
- Terraform AWS provider

## Sources Consulted
- AWS Nitro Enclaves User Guide: What is Nitro Enclaves? https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html
- AWS Nitro Enclaves User Guide: Creating an enclave https://docs.aws.amazon.com/enclaves/latest/user/create-enclave.html
- AWS Nitro Enclaves User Guide: Install the Nitro Enclaves CLI on Linux https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-cli-install.html
- AWS Nitro Enclaves User Guide: nitro-cli build-enclave https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-build-enclave.html
- AWS Nitro Enclaves User Guide: nitro-cli run-enclave https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-run-enclave.html
- AWS Nitro Enclaves User Guide: nitro-cli terminate-enclave https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-terminate-enclave.html
- AWS Nitro Enclaves User Guide: Cryptographic attestation https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html
- AWS Nitro Enclaves User Guide: Using cryptographic attestation with AWS KMS https://docs.aws.amazon.com/enclaves/latest/user/kms.html
- AWS KMS Developer Guide: Condition keys for Nitro Enclaves https://docs.aws.amazon.com/kms/latest/developerguide/conditions-nitro-enclave.html
- AWS KMS Developer Guide: Cryptographic attestation support in AWS KMS https://docs.aws.amazon.com/kms/latest/developerguide/services-nitro-enclaves.html
- AWS KMS Developer Guide: How to make attested calls to AWS KMS https://docs.aws.amazon.com/kms/latest/developerguide/how-nitro-enclaves.html
- Terraform AWS Provider: aws_instance resource https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Python socket module documentation https://docs.python.org/3/library/socket.html

## Issues Found
- The prerequisites said Nitro Enclaves require an instance with at least 4 vCPUs. AWS now documents supported instance families and sizes directly, including some supported 2-vCPU Graviton sizes. Updated the prerequisite to require a supported instance type with enough vCPUs and memory for both parent and enclave, while noting this tutorial uses `m5.xlarge`.
- The prerequisites described supported AMIs too loosely. Updated the wording to distinguish the parent instance OS from the enclave OS and to clarify that the shown commands use Amazon Linux 2.
- The Amazon Linux 2 install commands omitted adding the user to the `docker` group, logging out and reconnecting for group changes, and starting/enabling Docker. Added those steps to match the AWS Nitro Enclaves CLI installation guide.
- The client example claimed the full credit card number never existed on the parent instance, but the sample sends a plaintext literal from the parent. Replaced that claim with a production note to send encrypted data and decrypt inside the enclave.
- The KMS section overstated what a compromised host cannot do and did not mention that sensitive data should be encrypted before sending it to the parent or enclave. Added the documented KMS attestation behavior: KMS returns plaintext encrypted to the enclave public key from the attestation document, preventing plaintext from being returned to the parent.

## Review Notes
The code snippets are illustrative and syntactically valid, but the Python tokenization example is not a production-safe payment tokenization design because it uses an unsalted SHA-256 prefix. A future revision could show a complete KMS/Nitro Enclaves SDK decrypt flow instead of a plaintext vsock demonstration.
