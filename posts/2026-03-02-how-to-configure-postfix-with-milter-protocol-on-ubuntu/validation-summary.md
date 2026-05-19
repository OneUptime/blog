# Validation Summary: How to Configure Postfix with Milter Protocol on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Postfix
- Milter protocol
- OpenDKIM
- OpenDMARC
- Rspamd
- DKIM and DMARC email authentication

## Sources Consulted
- Postfix MILTER_README: https://www.postfix.org/MILTER_README.html
- Postfix smtpd(8) manual: https://www.postfix.org/smtpd.8.html
- OpenDKIM opendkim(8) manual: https://www.opendkim.org/opendkim.8.html
- OpenDKIM opendkim.conf(5) manual: https://www.opendkim.org/opendkim.conf.5.html
- Ubuntu OpenDKIM opendkim.conf(5) manpage: https://manpages.ubuntu.com/manpages/jammy/man5/opendkim.conf.5.html
- Debian OpenDMARC opendmarc.conf(5) manpage: https://manpages.debian.org/testing/opendmarc/opendmarc.conf.5.en.html
- Ubuntu OpenDMARC opendmarc.conf(5) manpage: https://manpages.ubuntu.com/manpages/questing/en/man5/opendmarc.conf.5.html
- Rspamd proxy worker documentation: https://docs.rspamd.com/workers/rspamd_proxy/
- Rspamd workers documentation: https://docs.rspamd.com/workers/

## Issues Found
- The OpenDKIM configuration combined `Domain`, `KeyFile`, and `Selector` with `KeyTable` and `SigningTable`. OpenDKIM documents these as separate signing configuration modes, and `KeyTable` overrides the single-key settings. Removed the single-key directives so the multi-domain table-based example is internally consistent.
- The OpenDMARC Unix socket example did not configure socket permissions for Postfix access. Added `UMask 002` and a `usermod -aG opendmarc postfix` command, matching the same socket-permission approach already used for OpenDKIM.
- The Postfix OpenDMARC example added OpenDMARC to `non_smtpd_milters`, although OpenDMARC is described in the post as incoming DMARC enforcement. Changed `non_smtpd_milters` to keep only OpenDKIM so local outgoing mail is signed without unnecessarily passing through OpenDMARC.
- The Rspamd `worker-proxy.inc` example duplicated the same `upstream "local"` block. Removed the duplicate block while keeping the documented self-scan proxy configuration.
- The `milter_default_action` example used `reject 451 4.7.1 Service unavailable`, which is not valid syntax for that Postfix parameter. Changed the example to `milter_default_action = reject`; `tempfail` remains the correct retry-later option.
- The DKIM testing note mentioned an `X-DKIM` header. Updated it to check for the standard `DKIM-Signature` header.

## Review Notes
- Postfix supports both `unix:` and `local:` socket prefixes, and its documentation notes that `local` is a synonym for `unix`. On systems where Postfix services run chrooted, absolute Unix socket paths can be interpreted relative to the Postfix queue directory; administrators may prefer TCP sockets or sockets under the Postfix chroot for those deployments.
- Rspamd's proxy worker commonly listens on `localhost:11332` in milter mode by default. The Unix socket example is valid when the socket permissions are configured so Postfix can connect.
