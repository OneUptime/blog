# Validation Summary: How to Configure Zabbix Email and Slack Notifications on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- Zabbix 7.0 notifications, media types, user media, and trigger actions
- Postfix SMTP relay configuration
- Email delivery with mailx
- Slack incoming webhooks
- Zabbix Slack webhook media type
- Bash and Python-based alert script

## Sources Consulted
- Zabbix documentation: Media types - https://www.zabbix.com/documentation/current/en/manual/config/notifications/media
- Zabbix documentation: Email media type - https://www.zabbix.com/documentation/current/en/manual/config/notifications/media/email
- Zabbix documentation: Custom alert scripts - https://www.zabbix.com/documentation/6.0/en/manual/config/notifications/media/script
- Zabbix documentation: Zabbix server AlertScriptsPath - https://www.zabbix.com/documentation/current/en/manual/appendix/config/zabbix_server
- Zabbix Slack integration documentation - https://www.zabbix.com/integrations/slack
- Zabbix 7.0 Slack media template - https://git.zabbix.com/projects/ZBX/repos/zabbix/browse/templates/media/slack/media_slack.yaml?at=release/7.0
- Slack documentation: Sending messages using incoming webhooks - https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Red Hat Enterprise Linux 9 documentation: Deploying mail servers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/index
- Postfix documentation: SASL README - https://www.postfix.org/SASL_README.html
- Postfix documentation: TLS deprecation notes - https://www.postfix.org/DEPRECATION_README.html
- Postfix documentation: TLS README - https://www.postfix.org/TLS_README.html

## Issues Found
- The Postfix relay example used the deprecated `smtp_use_tls = yes` setting. Replaced it with `smtp_tls_security_level = encrypt`, matching current Postfix TLS guidance for mandatory TLS to an authenticated relay.
- The Postfix SASL example did not install the common plain SASL mechanism package needed by authenticated SMTP relays on RHEL. Added `cyrus-sasl-plain`.
- The Postfix SASL options allowed plaintext mechanisms globally. Added `smtp_sasl_security_options = noanonymous, noplaintext` and `smtp_sasl_tls_security_options = noanonymous` so plaintext authentication is only allowed inside TLS.
- The Zabbix Slack section described Slack as a built-in media type and showed `channel: #monitoring-alerts` as a media type parameter. Updated it to describe Zabbix's official Slack webhook media type, importable as `media_slack.yaml`, with `channel: {ALERT.SENDTO}` and a user media "Send to" channel value.
- The Zabbix Slack section omitted the official Slack media type's `zabbix_url` parameter and the requirement to add the bot to the target channel. Added both.
- The custom Slack shell script interpolated alert text directly into JSON, which can break when subjects or messages contain quotes, backslashes, or newlines. Replaced the inline JSON string with Python `json.dumps`.
- The custom Slack webhook payload attempted to set `username` and `icon_emoji`. Current Slack incoming webhook documentation says these values inherit from the Slack app configuration and cannot be overridden by incoming webhook payloads, so those fields were removed.

## Review Notes
The custom script path `/usr/lib/zabbix/alertscripts` is common for packaged Zabbix installations, but the authoritative location is the server's `AlertScriptsPath` setting. Future improvements could mention checking `zabbix_server.conf` if the script media type cannot find `slack.sh`.
