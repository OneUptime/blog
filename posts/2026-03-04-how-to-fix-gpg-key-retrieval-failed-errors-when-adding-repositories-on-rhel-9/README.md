# How to Fix 'GPG Key Retrieval Failed' Errors When Adding Repositories on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on fix 'gpg key retrieval failed' errors when adding repositories on RHEL with practical examples and commands.

---

GPG key retrieval failures prevent adding third-party repositories on RHEL. Here is how to fix them.

## The Error

```
GPG key retrieval failed: [Errno 14] curl#37 - "Couldn't open file /etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-9"
```

## Import the Key Manually

```bash
# For EPEL
sudo rpm --import https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-9

# For Red Hat
sudo rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
```

## Download the Key First

If direct import fails:

```bash
curl -o /tmp/RPM-GPG-KEY-EPEL-9 https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-9
sudo rpm --import /tmp/RPM-GPG-KEY-EPEL-9
```

## Check Installed GPG Keys

```bash
rpm -qa gpg-pubkey*
rpm -qi gpg-pubkey-<key-id>
```

## Disable GPG Check Temporarily

```bash
sudo dnf install package-name --nogpgcheck
```

Warning: Only use this for trusted packages.

## Fix the Repository Configuration

```bash
sudo vi /etc/yum.repos.d/epel.repo
```

Ensure the gpgkey line points to the correct location:

```
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-9
```

## Verify Network Access to Key Server

```bash
curl -I https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-9
```

## Remove and Re-Import

```bash
sudo rpm -e gpg-pubkey-<key-id>
sudo rpm --import https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-9
```

## Conclusion

GPG key errors on RHEL are resolved by importing the correct key from a trusted source. Always verify GPG keys to ensure package integrity and authenticity.

