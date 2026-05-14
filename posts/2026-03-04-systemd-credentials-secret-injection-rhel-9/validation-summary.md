# Validation Summary: How to Use systemd Credentials for Secure Secret Injection on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd service units
- systemd credentials
- systemd-creds
- TPM2-bound secrets
- Python
- Bash

## Sources Consulted
- systemd.exec official manual, Credentials section: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd-creds official manual for systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd-creds.html
- systemd-creds official latest manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-creds.html
- Red Hat Enterprise Linux 9 documentation index: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9

## Issues Found
- The post described all credentials as encrypted at rest. I changed this to clarify that encrypted credentials are encrypted at rest, because systemd also supports plain credentials through `LoadCredential=`.
- The encrypted credential examples used `/etc/credstore/`. I changed them to `/etc/credstore.encrypted/`, which is the documented credential store searched for encrypted credentials.
- The encrypted credential filenames and service credential IDs did not consistently match. I added `--name=` and aligned filenames with the IDs loaded by the unit so decryption name validation matches the service configuration.
- The host-key example did not specify `--with-key=host`, even though `systemd-creds encrypt` defaults to automatic key selection and may use TPM2 plus the host key on typical systems. I added `--with-key=host`.
- The plain-text development example used `/etc/credstore.plain/`, which is not the documented automatic plain credential store. I changed it to `/etc/credstore/`.
- The TPM2 example wrote to `/etc/credstore/` and did not set a matching credential name. I changed it to `/etc/credstore.encrypted/tpm-secret` and added `--name=tpm-secret`.

## Review Notes
The Python and Bash examples are syntactically valid for reading text credentials from `$CREDENTIALS_DIRECTORY`. Future improvements could mention the per-unit accumulated credential size limit and that the runtime credentials directory is read-only and backed by non-swappable memory only when supported and permitted.
