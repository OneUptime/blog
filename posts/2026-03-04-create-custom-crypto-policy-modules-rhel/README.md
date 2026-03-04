# How to Create Custom Crypto Policy Modules on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, Security, TLS, Encryption, Linux

Description: Learn how to create custom crypto policy modules on RHEL to tailor cryptographic settings beyond the built-in DEFAULT, LEGACY, FUTURE, and FIPS policies.

---

While RHEL ships with four built-in crypto policies, sometimes you need to fine-tune settings. Custom policy modules let you extend or modify a base policy without writing one from scratch. Modules are applied on top of an existing policy using the colon syntax.

## Understanding Policy Module Files

Custom modules live in `/etc/crypto-policies/policies/modules/` and use the `.pmod` extension. They contain directives that add or remove specific algorithms from a base policy.

## Creating a Custom Module

For example, suppose you want to use the DEFAULT policy but disable CBC-mode ciphers for SSH:

```bash
# Create the module directory if it does not exist
sudo mkdir -p /etc/crypto-policies/policies/modules

# Create a module file that disables CBC ciphers for SSH
sudo tee /etc/crypto-policies/policies/modules/NO-CBC.pmod << 'EOF'
# Disable CBC mode ciphers in SSH
cipher@SSH = -AES-256-CBC -AES-128-CBC -3DES-CBC
EOF
```

## Applying the Custom Module

Use the colon syntax to stack a module on top of a base policy:

```bash
# Apply DEFAULT policy with the NO-CBC module
sudo update-crypto-policies --set DEFAULT:NO-CBC

# Verify the active policy
update-crypto-policies --show
# Output: DEFAULT:NO-CBC
```

## Creating a More Complex Module

Here is a module that enforces minimum 256-bit key sizes and disables SHA-1:

```bash
sudo tee /etc/crypto-policies/policies/modules/STRONG256.pmod << 'EOF'
# Require minimum 256-bit symmetric ciphers
cipher = -AES-128-CBC -AES-128-GCM -AES-128-CCM -AES-128-CTR
# Disable SHA-1 signatures
hash = -SHA1
sign = -RSA-PSS-SHA1 -RSA-SHA1 -ECDSA-SHA1
# Set minimum key sizes
min_rsa_size = 3072
min_dh_size = 3072
EOF

# Apply it on top of FUTURE policy
sudo update-crypto-policies --set FUTURE:STRONG256
```

## Verifying the Module Effect

```bash
# Check the generated backend configuration for OpenSSL
cat /etc/crypto-policies/back-ends/openssl.config

# Test that forbidden ciphers are actually blocked
openssl ciphers -v 'ALL' 2>/dev/null | grep -i cbc
```

## Removing a Custom Module

```bash
# Revert to base policy without the module
sudo update-crypto-policies --set DEFAULT

# Optionally remove the module file
sudo rm /etc/crypto-policies/policies/modules/NO-CBC.pmod
```

Custom crypto policy modules give you granular control over cryptographic settings while keeping the simplicity of the system-wide policy framework. You can stack multiple modules and version control them for consistent deployment across systems.
