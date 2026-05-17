# Validation Summary: How to Set Up Nginx with NAXSI WAF on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NAXSI (Nginx Anti XSS and SQL Injection WAF module)
- Nginx (1.24.0 used in source build example)
- Ubuntu (modern releases: 20.04 / 22.04 / 24.04)
- PHP-FPM (8.1 socket path referenced in vhost example)
- nxtool / nxapi (NAXSI log analyzer for generating whitelists)

## Sources Consulted
- NAXSI archived upstream repo: https://github.com/nbs-system/naxsi
- NAXSI maintained fork: https://github.com/wargio/naxsi
- NAXSI directives reference: https://wargio.github.io/naxsi/directives.html
- NAXSI core rules file: https://github.com/nbs-system/naxsi/blob/master/naxsi_config/naxsi_core.rules
- nxapi/nxtool source: https://github.com/nbs-system/naxsi/blob/master/nxapi/nxtool.py
- NAXSI log format wiki: https://github.com/nbs-system/naxsi/wiki/naxsilogs
- nginx download archive: http://nginx.org/download/
- Ubuntu package archive (packages.ubuntu.com) for `nginx-naxsi`

## Issues Found

1. **`nginx-naxsi` Ubuntu package is no longer available.** The original `Install NAXSI on Ubuntu` section recommended `sudo apt-get install -y nginx-naxsi` as the primary install method. This package was only present in older Ubuntu releases (precise/trusty era) and is not in 20.04, 22.04, or 24.04 repositories. Removed the apt install path and promoted "Build from Source" to the primary (and only) install method. Also added `wget` and `unzip` to the build dependencies so the subsequent download steps work on a minimal Ubuntu image, and added a note that `nbs-system/naxsi` was archived in November 2023 and that `wargio/naxsi` is the actively maintained fork.

2. **`pip3 install nxtool` is incorrect.** nxtool is not a published PyPI package — it ships as part of the NAXSI source tree under the `nxapi/` directory and is invoked as `./nxtool.py`. Replaced the `pip3 install nxtool` step with instructions to extract the previously downloaded NAXSI source, install the `requirements.txt` dependencies from `nxapi/`, and run `./nxtool.py` from there.

## Review Notes

- The `nbs-system/naxsi` GitHub URLs used for downloading the source ZIP and core rules still resolve (the repo is archived but read-only and remains accessible), so the wget/unzip commands continue to work as written. New deployments wanting active maintenance should switch to `wargio/naxsi`, where the core rules file moved to `naxsi_rules/naxsi_core.rules`.
- The NAXSI directive syntax (`LearningMode`, `SecRulesEnabled`, `DeniedUrl`, `CheckRule`, `BasicRule`) and the whitelist matchzone syntax (`mz:$ARGS_VAR:q`, `mz:$BODY_VAR:content`, `mz:$HEADERS_VAR:cookie`, `mz:URL`) all match the official NAXSI directives reference.
- The `NAXSI_FMT` log format with `cscore0`/`score0`/`zone0`/`id0`/`var_name0` fields is correct per the NAXSI wiki.
- nginx 1.24.0 is used as an example version. It is a valid stable release; newer mainline/stable versions exist (e.g., 1.26.x, 1.27.x) but the source build approach is identical — the example version does not need updating.
- The PHP-FPM socket `/var/run/php/php8.1-fpm.sock` is correct for Ubuntu 22.04. On 24.04 the default is `php8.3-fpm.sock`. Reader should adjust to whichever PHP version their server runs.
