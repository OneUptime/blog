# Validation Summary: How to Encrypt Kafka Data at Rest

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka broker storage and client serialization
- Linux LUKS/dm-crypt with cryptsetup
- HashiCorp Vault KV v2 via hvac
- AWS EBS encryption and AWS KMS with Terraform
- Google Cloud Persistent Disk CMEK and Cloud KMS with Terraform
- Java Kafka serializers/deserializers and AES-GCM
- Python confluent-kafka, cryptography AESGCM, and AWS KMS envelope encryption

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Apache Kafka Java client Javadocs: https://kafka.apache.org/40/javadoc/
- cryptsetup project and man page documentation: https://gitlab.com/cryptsetup/cryptsetup
- HashiCorp hvac KV v2 usage documentation: https://python-hvac.org/en/stable/usage/secrets_engines/kv_v2.html
- AWS EBS encryption documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
- AWS KMS GenerateDataKey API documentation: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- Terraform AWS provider aws_ebs_volume documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- Terraform AWS provider aws_kms_key documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Google Cloud Persistent Disk encryption documentation: https://cloud.google.com/compute/docs/disks/customer-managed-encryption
- Terraform Google provider google_compute_disk documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk
- Terraform Google provider Cloud KMS resources documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key
- Java GCMParameterSpec documentation: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/javax/crypto/spec/GCMParameterSpec.html
- Python cryptography AESGCM documentation: https://cryptography.io/en/latest/hazmat/primitives/aead/
- Confluent Kafka Python client documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found
- The cloud provider encryption table listed GCS as the GCP storage example for Kafka broker data at rest. Changed it to Persistent Disk to match the later GCP disk encryption example and Kafka broker disk usage.
- The Vault/LUKS example stored rotated keys as hex strings but retrieved them as UTF-8 text and then mixed raw bytes and text passphrases when calling cryptsetup. Updated the example to decode hex key material from Vault, use `cryptsetup luksOpen --key-file -`, and add rotated binary keys with temporary key files.
- The AWS Terraform snippet referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added `data "aws_caller_identity" "current" {}`.
- The GCP Terraform snippet referenced a KMS key ring without declaring it. Added a `google_kms_key_ring` resource in the same region as the disk.
- The Java serializer/deserializer snippet showed two public Java classes in one source file and configured them as `com.example` classes without a package declaration. Split the snippet into separate Java source examples and added `package com.example;`.
- The Java encrypted client example labeled a 32-character hex key as a 256-bit key. Replaced it with a 64-character hex key so the AES key is actually 256 bits.

## Review Notes
The examples are suitable as instructional snippets, but production deployments should also cover key access policies, key recovery procedures, Kafka topic re-encryption during key rotation, and service-account permissions for cloud KMS keys.
