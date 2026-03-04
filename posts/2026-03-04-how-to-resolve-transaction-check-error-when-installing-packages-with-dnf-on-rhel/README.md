# How to Resolve 'Transaction Check Error' When Installing Packages with DNF on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on resolve 'transaction check error' when installing packages with dnf on rhel with practical examples and commands.

---

Transaction check errors during DNF package installation on RHEL indicate dependency conflicts or corrupted metadata. Here is how to resolve them.

## Identify the Error

The error typically looks like:

```
Transaction check error:
  file /usr/lib64/libfoo.so from install of package-1.0 conflicts with file from package package-2.0
```

## Clean DNF Cache and Retry

```bash
sudo dnf clean all
sudo dnf makecache
sudo dnf update -y
```

## Check for Duplicate Packages

```bash
sudo dnf list --duplicates
```

Remove duplicates:

```bash
sudo dnf remove --duplicates
```

## Fix Broken Dependencies

```bash
sudo dnf distro-sync
```

## Use the skip-broken Option

```bash
sudo dnf update --skip-broken
```

## Remove Conflicting Package

```bash
# Identify the conflict from the error message
sudo dnf remove conflicting-package
sudo dnf install desired-package
```

## Rebuild the RPM Database

```bash
sudo rpm --rebuilddb
```

## Check for Third-Party Repository Conflicts

```bash
sudo dnf repolist
# Disable third-party repos temporarily
sudo dnf update --disablerepo=epel
```

## Force Package Installation (Last Resort)

```bash
sudo rpm -ivh --force package.rpm
```

Warning: Only use --force if you understand the consequences.

## Conclusion

Transaction check errors in DNF typically result from dependency conflicts between packages or repositories. Clean the cache, sync the distribution packages, and resolve conflicts systematically before resorting to forced installation.

