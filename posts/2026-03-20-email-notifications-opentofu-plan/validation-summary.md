# Validation Summary: How to Set Up Email Notifications for OpenTofu Plan Results

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Bash
- curl SMTP
- Amazon SES and the AWS CLI
- GitHub Actions
- Twilio SendGrid Mail Send API
- GitLab CI/CD
- jq

## Sources Consulted
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command: https://opentofu.org/docs/v1.9/cli/commands/show/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- AWS CLI `ses send-email` command reference: https://docs.aws.amazon.com/cli/latest/reference/ses/send-email.html
- Twilio SendGrid Mail Send API: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- Twilio SendGrid Personalizations: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/personalizations
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The description said the post covered OpenTofu plan and apply results, but the content only covered plan results. I updated the description to match the actual scope.
- The SMTP section said the example used `sendmail` or `curl`, but the code only used `curl` over SMTP. I corrected the heading and accompanying description.
- The generic `tofu plan ... | tee ...` capture snippet could mask a failed `tofu plan` exit code in a plain Bash shell. I added `set -o pipefail` so failures are preserved.
- The GitHub Actions example used `opentofu/setup-opentofu@v1`, while the current documented usage is `@v2`. I updated the action version.
- The AWS SES example used unsupported `aws ses send-email` flags (`--to`, `--subject`, and `--text`). I replaced them with the documented `--destination` and `--message` JSON inputs.
- The SendGrid example interpolated multiline plan output directly into a JSON heredoc, which would produce invalid JSON and incomplete HTML escaping. I rewrote it to build the request body with `jq` and to escape `&`, `<`, and `>`.
- The GitLab CI example omitted `SMTP_PASS`, which the SMTP `curl` example requires for authenticated SMTP delivery. I added the missing variable.

## Review Notes
- OpenTofu `1.9.0` is a valid pinned version, but newer OpenTofu releases exist as of 2026-05-01.
- Amazon SES requires a verified sender, and SES sandbox accounts also require verified recipients.
- Twilio SendGrid requires a verified sender identity for the `from` address used in API requests.
