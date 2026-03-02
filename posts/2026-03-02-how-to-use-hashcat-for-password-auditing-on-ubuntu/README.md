# How to Use Hashcat for Password Auditing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Password Auditing, Hashcat, Penetration Testing

Description: Learn how to install and use Hashcat on Ubuntu for password auditing, hash cracking modes, wordlist attacks, and rule-based attacks to test your organization's password strength.

---

Password auditing is a core part of any security assessment. Weak passwords remain one of the most common attack vectors, and testing your own systems with tools like Hashcat helps you understand exposure before attackers do. Hashcat is the world's fastest password recovery tool, supporting hundreds of hash types and multiple attack modes.

This post walks through installing Hashcat on Ubuntu, understanding attack modes, and running practical audits against common hash types.

## Installing Hashcat on Ubuntu

Hashcat is available directly from Ubuntu's package repositories, but the version may lag behind the upstream release. For the most capable version, install from the official release.

```bash
# Install via apt (simpler, slightly older version)
sudo apt update
sudo apt install hashcat -y

# Check version
hashcat --version
```

For the latest version, download from the Hashcat releases page:

```bash
# Download latest Hashcat release
wget https://hashcat.net/files/hashcat-6.2.6.tar.gz

# Extract and build
tar xf hashcat-6.2.6.tar.gz
cd hashcat-6.2.6
make
sudo make install
```

If you have a GPU available, install the appropriate OpenCL or CUDA drivers for significant performance gains:

```bash
# For NVIDIA GPUs - install CUDA toolkit
sudo apt install nvidia-cuda-toolkit -y

# For AMD GPUs - install ROCm
# Follow AMD ROCm installation docs for Ubuntu

# Verify GPU detection
hashcat -I
```

## Understanding Hash Types

Hashcat uses numeric identifiers for hash types. Knowing the hash type before starting is essential.

```bash
# List all supported hash types
hashcat --help | grep -i "md5\|sha\|bcrypt\|ntlm" | head -30

# Common hash mode numbers:
# 0    = MD5
# 100  = SHA1
# 1400 = SHA-256
# 3200 = bcrypt
# 1000 = NTLM (Windows)
# 5600 = NetNTLMv2
# 1800 = sha512crypt (Linux shadow passwords)
```

To identify an unknown hash, use hashid or hashcat's example hashes:

```bash
# Install hashid
pip3 install hashid

# Identify hash type
hashid '$6$rounds=656000$salt$hashedvalue'
```

## Preparing Wordlists

The quality of your wordlist directly impacts success rates. The classic starting point is rockyou.txt.

```bash
# rockyou.txt is included with Kali, or download separately
# On Ubuntu, you can find it in SecLists
sudo apt install seclists -y

# SecLists wordlists location
ls /usr/share/seclists/Passwords/

# Use rockyou.txt from SecLists
ls /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz

# Extract it
cd /usr/share/seclists/Passwords/Leaked-Databases/
sudo tar xf rockyou.txt.tar.gz
```

## Dictionary Attack (Attack Mode 0)

The dictionary attack tries each word in a wordlist against the hash.

```bash
# Create a test hash first - MD5 of "password123"
echo -n "password123" | md5sum | cut -d' ' -f1 > /tmp/test.hash
cat /tmp/test.hash

# Run dictionary attack against MD5 hash (-m 0)
hashcat -m 0 -a 0 /tmp/test.hash /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt

# Show the cracked result
hashcat -m 0 /tmp/test.hash --show
```

For Linux shadow file hashes (sha512crypt):

```bash
# Extract hash from /etc/shadow (requires root)
sudo grep testuser /etc/shadow | cut -d: -f2 > /tmp/shadow.hash

# Run against shadow hash (-m 1800)
hashcat -m 1800 -a 0 /tmp/shadow.hash /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
```

## Brute Force Attack (Attack Mode 3)

When wordlists fail, brute force attacks try all combinations of characters within a defined mask.

```bash
# Define character sets:
# ?l = lowercase letters (a-z)
# ?u = uppercase letters (A-Z)
# ?d = digits (0-9)
# ?s = special characters
# ?a = all printable ASCII

# Crack 6-character lowercase password
hashcat -m 0 -a 3 /tmp/test.hash '?l?l?l?l?l?l'

# Crack 8-character alphanumeric password
hashcat -m 0 -a 3 /tmp/test.hash '?a?a?a?a?a?a?a?a'

# Use increment mode to try all lengths from 4 to 8
hashcat -m 0 -a 3 --increment --increment-min=4 --increment-max=8 /tmp/test.hash '?a?a?a?a?a?a?a?a'
```

## Rule-Based Attacks (Attack Mode 0 with Rules)

Rules are transformations applied to wordlist entries. They dramatically expand coverage without requiring massive wordlists.

```bash
# Hashcat ships with rule files
ls /usr/share/hashcat/rules/

# Common rule files:
# best64.rule - 64 most effective transformations
# dive.rule - comprehensive transformations
# rockyou-30000.rule - rockyou-derived rules

# Apply best64 rules to rockyou wordlist
hashcat -m 0 -a 0 /tmp/test.hash /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# Stack multiple rule files
hashcat -m 0 -a 0 /tmp/test.hash /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule \
  -r /usr/share/hashcat/rules/toggles1.rule
```

## Combinator Attack (Attack Mode 1)

Combines words from two wordlists to generate candidates like "password123".

```bash
# Create two small wordlists
echo -e "password\nadmin\nwelcome" > /tmp/words1.txt
echo -e "123\n2024\n!" > /tmp/words2.txt

# Run combinator attack
hashcat -m 0 -a 1 /tmp/test.hash /tmp/words1.txt /tmp/words2.txt

# Add rules to each side of the combination
hashcat -m 0 -a 1 /tmp/test.hash /tmp/words1.txt /tmp/words2.txt \
  -j 'u' -k 'd'
# -j applies rule to left wordlist (u = uppercase)
# -k applies rule to right wordlist (d = append digit)
```

## Performance Optimization

```bash
# Check available devices
hashcat -I

# Force CPU usage if no GPU (slower)
hashcat -m 0 -a 0 /tmp/test.hash wordlist.txt --force

# Set workload profile (1=low, 2=default, 3=high, 4=nightmare)
hashcat -m 0 -a 0 /tmp/test.hash wordlist.txt -w 3

# Save session and restore later
hashcat -m 0 -a 0 /tmp/test.hash wordlist.txt --session=audit1

# Restore a session
hashcat --restore --session=audit1

# Limit runtime (useful for scheduled audits)
hashcat -m 0 -a 0 /tmp/test.hash wordlist.txt --runtime=3600
```

## Auditing NTLM Hashes (Active Directory)

For environments with Windows Active Directory, NTLM hash auditing is common:

```bash
# Dump NTLM hashes using secretsdump (from impacket, for authorized use only)
# impacket-secretsdump domain/admin@dc_ip -outputfile hashes

# Crack NTLM hashes (-m 1000)
hashcat -m 1000 -a 0 hashes.ntds /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# Show all cracked results
hashcat -m 1000 hashes.ntds --show
```

## Generating Reports

After an audit, document findings properly:

```bash
# Export all cracked hashes with their plaintext passwords
hashcat -m 0 /tmp/test.hash --show > /tmp/cracked_hashes.txt

# Count total cracked vs total attempted
wc -l /tmp/cracked_hashes.txt
```

## Legal and Ethical Considerations

Hashcat should only be used on systems and hashes you own or have explicit written permission to test. Unauthorized use is a criminal offense in most jurisdictions. Always obtain written authorization, document scope, and handle cracked passwords securely - they should be deleted after reporting and never stored unnecessarily.

For monitoring your Ubuntu servers and detecting brute force attempts against your own systems, consider setting up alerting with a tool like [OneUptime](https://oneuptime.com/blog/post/2026-03-02-how-to-configure-automated-compliance-monitoring-on-ubuntu/view) to get notified of suspicious authentication activity in real time.
