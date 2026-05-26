# Validation Summary: How to Use Ansible to Manage AWS Key Pairs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible collections: amazon.aws, community.crypto, ansible.posix
- AWS EC2 key pairs
- OpenSSH / SSH authorized_keys
- AWS IAM permissions

## Sources Consulted
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible amazon.aws.ec2_key module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_key_module.html
- Ansible amazon.aws.ec2_key_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_key_info_module.html
- Ansible amazon.aws.ec2_instance_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Ansible community.crypto.openssh_keypair module: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssh_keypair_module.html
- Ansible ansible.posix.authorized_key module: https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible ansible.builtin.wait_for_connection module: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/wait_for_connection_module.html
- AWS EC2 CreateKeyPair API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateKeyPair.html
- AWS EC2 key pair user guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html

## Issues Found
- The opening sentence said every EC2 instance needs a key pair for SSH access. Changed it to "Many Linux EC2 instances" because EC2 instances can be accessed or managed through other mechanisms, and Windows instances do not use SSH key pairs in the same way.
- The prerequisites only listed `amazon.aws` and used a broad `Ansible 2.9+` requirement. Updated this to a current Ansible installation with `amazon.aws`, `community.crypto`, and `ansible.posix`, because the examples use modules from all three collections and current `amazon.aws` documentation states its supported ansible-core version is 2.16 or newer.
- The collection installation command installed only `amazon.aws`. Updated it to install `amazon.aws community.crypto ansible.posix`.
- The AWS-generated key pair task registered private key material without `no_log`. Added `no_log: true`, matching the Ansible module documentation's security guidance for generated private keys.
- The Ed25519 explanation omitted AWS platform limits. Added the Windows-instance caveat from the AWS and Ansible documentation.
- The rotation section claimed the playbook removed the old key pair from AWS, but the code only removed the old public key from instance `authorized_keys`. Corrected the wording to match the code.
- The rotation play used a host pattern based on `old_key_name` in a place where the variable was not safely available and assumed an inventory group that was not created. Added an `add_host` task to create a temporary group from the discovered EC2 instances and changed the second play to target that group by default.
- The rotation play attempted to verify the new key by setting `ansible_ssh_private_key_file` only on the `wait_for_connection` task. Added a host fact and `meta: reset_connection` so Ansible reconnects with the new private key before verification.

## Review Notes
Ansible is not installed in the local environment, so I could not run `ansible-playbook --syntax-check`. The examples were reviewed statically against the current official module documentation. The rotation example still assumes the managed instances are reachable from the Ansible control node by public DNS name or private IP and that `ec2-user` is the correct SSH user for the AMI.
