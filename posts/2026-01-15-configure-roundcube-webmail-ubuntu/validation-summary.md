# Validation Summary: How to Configure Roundcube Webmail on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- Roundcube Webmail (1.6.x)
- Ubuntu (apt packaging)
- Apache 2.4 and Nginx + PHP-FPM
- PHP 8.x (php-fpm, OPcache)
- MySQL / MariaDB and PostgreSQL
- IMAP / SMTP (Postfix + Dovecot context)
- Let's Encrypt / Certbot (SSL/TLS)
- Roundcube plugins: managesieve, calendar (Kolab), password
- Fail2Ban

## Sources Consulted
- Roundcube official config defaults (release-1.6): https://github.com/roundcube/roundcubemail/blob/release-1.6/config/defaults.inc.php
- Roundcube configuration wiki: https://github.com/roundcube/roundcubemail/wiki/Configuration
- Roundcube releases (download URL / version format): https://github.com/roundcube/roundcubemail/releases
- Kolab calendar plugin mirror (install method/dependencies): https://github.com/kolab-roundcube-plugins-mirror/calendar
- Cloudron forum thread confirming `login_rate_limit` semantics: https://forum.cloudron.io/topic/4725

## Issues Found
All configuration *values* and commands in the post were verified as correct against the official Roundcube 1.6 defaults. The errors found were inaccurate inline code comments that mischaracterized otherwise-valid options:

1. **`imap_host` substitution-variable comment** — The post described `%h` as "user's domain (from email address)" and `%d` as "domain from email address." Per the official defaults, `%h` is the user's IMAP hostname and the domain-from-email variable is `%s` (not `%d`, which is the HTTP host domain). Corrected the comment to list `%h`, `%n`, and `%s` with accurate meanings.

2. **Duplicate / mislabeled `login_rate_limit`** — In the Security section, `$config['login_rate_limit'] = 5;` appeared twice. The first instance carried the comment "Deny access from these IP addresses" (unrelated to what the option does), and the second called it a "delay between failed login attempts (seconds)." The option is actually the maximum number of failed login attempts allowed per minute (default 3). Removed the duplicate and corrected the comment.

3. **`auto_create_user` comment** — Was labeled "Disable auto-login feature." The option actually auto-registers users in the database on first successful IMAP login. Corrected the comment.

4. **`login_username_filter` comment** — Was labeled "Prevent username enumeration." The `'email'` value restricts the login field to accept only full email addresses. Corrected the comment to describe the actual behavior.

5. **`mime_magic` comment** — Was described as a "MIME type detection: 'mime_content_type', 'file', or 'finfo'" selector. The option is actually the filesystem path to the mime.magic database used by PHP's fileinfo extension. Corrected the comment.

## Review Notes
- The PHP requirement is stated as "PHP 7.4 or later (PHP 8.x recommended)." Roundcube 1.6 technically supports PHP 7.3+, so 7.4+ is a safe, slightly conservative subset — left as-is.
- Roundcube `1.6.9` and its complete-tarball download URL format were confirmed valid; newer 1.6.x patch releases exist, so readers should pull the current latest for security fixes (the post already advises keeping Roundcube updated).
- The Kolab calendar plugin git-clone URLs (`kolab-roundcube-plugins-mirror/calendar`, `libcalendaring`, `libkolab`) are valid mirrors. Note that the calendar plugin's Elastic skin requires building LESS/CSS (`lessc`) — not mentioned in the post — so the plugin UI may need that extra step to render fully under the default elastic skin.
- `smtp_host`/`imap_host` prefixed-URI format (`ssl://`, `tls://`) and `des_key` 24-character requirement are correct for 1.5+/1.6.
- `max_message_size = '25M'` uses a unit-suffixed string; Roundcube parses byte units, so this is valid despite the "in bytes" comment.
