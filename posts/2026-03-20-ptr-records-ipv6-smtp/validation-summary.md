# Validation Summary: How to Configure PTR Records for IPv6 SMTP Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS
- PTR records
- Reverse DNS
- SMTP
- Postfix
- Python `ipaddress`
- `dig`
- OpenSSL
- Hetzner Cloud API

## Sources Consulted
- RFC 3596, "DNS Extensions to Support IP Version 6": https://www.rfc-editor.org/rfc/rfc3596.txt
- Python standard library documentation for `ipaddress.reverse_pointer`: https://docs.python.org/3/library/ipaddress.html
- Google Workspace Admin Help, "Email sender guidelines": https://support.google.com/a/answer/81126?hl=en
- AWS EC2 documentation, "Elastic IP addresses": https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS CLI documentation, `modify-address-attribute`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-address-attribute.html
- Hetzner Cloud changelog: https://docs.hetzner.cloud/changelog
- Hetzner official Go client, `hcloud/primary_ip.go`: https://github.com/hetznercloud/hcloud-go/blob/main/hcloud/primary_ip.go
- Postfix `postconf(1)` manual: https://www.postfix.org/postconf.1.html
- Postfix `postconf(5)` manual: https://www.postfix.org/postconf.5.html

## Issues Found
- The AWS example was incorrect for this post. The original command used `update-address-attribute`, but the current AWS CLI command is `modify-address-attribute`, and AWS Elastic IP reverse DNS applies to IPv4 Elastic IPs, not IPv6. Because this post is specifically about IPv6 SMTP servers, I removed the AWS example instead of leaving an IPv4-specific workflow in place.
- The Hetzner example used the wrong method, endpoint, and payload. Hetzner's current Primary IP reverse-DNS workflow uses `POST /primary_ips/{id}/actions/change_dns_ptr` and includes both `ip` and `dns_ptr` in the request body. I corrected the example accordingly.
- The "Testing with a Remote Mail Server Perspective" section was overstated. `nslookup` against the local resolver does not represent a remote receiver's view, and connecting to your own SMTP service does not verify what a receiver sees for your PTR. I changed this section to check public DNS visibility with `dig @1.1.1.1 -x ...` and to separately inspect the SMTP greeting on the IPv6 listener.
- The Postfix verification command was unreliable. Grepping default mail logs for `EHLO` or `helo` is not a dependable way to verify the configured client hostname. I replaced it with `postconf myhostname smtp_helo_name`, which directly shows the values Postfix is configured to use.

## Review Notes
- The reverse-pointer explanation, `ip6.arpa` example, and nibble-reversal output are correct and align with RFC 3596 and Python's `ipaddress` documentation.
- The deliverability guidance about PTR plus matching forward DNS is consistent with Google's current sender requirements for SMTP servers.
- `smtp_helo_name` defaults to `$myhostname` in Postfix, so explicitly setting both is valid but slightly redundant.
