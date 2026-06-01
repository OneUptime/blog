# Validation Summary: How to Use Nitro Enclaves for Confidential Computing on EC2

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Nitro Enclaves
- Amazon EC2
- AWS KMS attestation
- Nitro Enclaves CLI
- vsock and KMS vsock proxy
- Docker / Enclave Image Files
- Python socket programming
- Amazon Linux 2023 systemd setup

## Sources Consulted
- AWS Nitro Enclaves: What is Nitro Enclaves? https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html
- AWS Nitro Enclaves: Creating an enclave https://docs.aws.amazon.com/enclaves/latest/user/create-enclave.html
- AWS Nitro Enclaves: Install the Nitro Enclaves CLI on Linux https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-cli-install.html
- AWS Nitro Enclaves: nitro-cli build-enclave https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-build-enclave.html
- AWS Nitro Enclaves: nitro-cli run-enclave https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-run-enclave.html
- AWS Nitro Enclaves: nitro-cli console https://docs.aws.amazon.com/enclaves/latest/user/cmd-nitro-console.html
- AWS KMS Developer Guide: Condition keys for Nitro Enclaves https://docs.aws.amazon.com/kms/latest/developerguide/conditions-nitro-enclave.html
- AWS Nitro Enclaves concepts / KMS proxy https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-concepts.html
- AWS Nitro Enclaves CLI vsock proxy README https://github.com/aws/aws-nitro-enclaves-cli/blob/main/vsock_proxy/README.md
- Python socket module documentation https://docs.python.org/3/library/socket.html

## Issues Found
- The architecture diagram showed parent application traffic passing through the vsock proxy. Updated it so the parent application communicates directly with the enclave over vsock, while the enclave reaches KMS through the KMS vsock proxy.
- The post claimed sensitive data never exists in parent memory, but the example sends a plaintext credit card number from the parent. Added the necessary caveat that plaintext stays out of parent memory only when encrypted data is sent to the parent and decrypted inside the enclave.
- The prerequisites overstated the 4-vCPU / 2-vCPU requirement. Updated the wording to refer to AWS's supported instance list and noted the Graviton 2-vCPU allocator exception.
- The Amazon Linux 2023 setup omitted Docker group membership and starting Docker, which are needed for the Docker build workflow shown later. Added the documented Docker group and service commands.
- The example said the enclave app processes encrypted data, but the sample code processes plaintext sensitive data. Reworded the sentence to match the code.
- The KMS policy example used a 9-digit AWS account ID. Replaced it with a valid 12-digit example account ID.
- The KMS attestation explanation omitted that the request must include a signed attestation document. Added that condition to avoid implying the key policy alone proves enclave identity.
- The vsock proxy YAML was missing the required `allowlist` top-level key. Updated the configuration snippet to match the documented format.
- The payment processing use case repeated the false "never exists in parent memory" claim without caveat. Clarified that this is true only when card numbers arrive encrypted and are decrypted only in the enclave.
- The debugging section did not mention that `nitro-cli console` works only for enclaves launched with `--debug-mode`. Added that development caveat.

## Review Notes
The Python examples are syntactically valid and use the Linux `AF_VSOCK` socket interface, but they are intentionally minimal. A production implementation should add request framing, authentication/authorization for parent-to-enclave messages, encrypted payload handling, and Nitro Enclaves SDK-based KMS calls inside the enclave.
