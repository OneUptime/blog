# How to Install and Configure AWStats for Web Analytics on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Analytics, Linux

Description: Step-by-step guide on install and configure awstats for web analytics using Red Hat Enterprise Linux 9.

---

AWStats for Web Analytics can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Enable EPEL on RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install AWStats and Apache HTTP Server
sudo dnf install -y awstats httpd
```

On CentOS Stream 9, enable the CRB and EPEL repositories before installing `awstats` and `httpd`.

## Step 2: Configure AWStats

Edit the configuration file to match your environment:

```bash
# Create a site-specific configuration file
sudo cp /etc/awstats/awstats.model.conf /etc/awstats/awstats.example.com.conf

# Open the configuration file
sudo vi /etc/awstats/awstats.example.com.conf
```

Adjust the settings according to your requirements. Key parameters to configure include the log file path, log format, site domain, host aliases, and data directory.

```apache
LogFile="/var/log/httpd/access_log"
LogType=W
LogFormat=1
SiteDomain="example.com"
HostAliases="www.example.com localhost 127.0.0.1"
DirData="/var/lib/awstats"
AllowToUpdateStatsFromBrowser=0
```

```bash
# Restart Apache to apply the packaged AWStats web configuration
sudo systemctl restart httpd
```

## Step 3: Enable and Start Apache

```bash
# Enable Apache to start on boot
sudo systemctl enable httpd

# Start Apache
sudo systemctl start httpd

# Check the status
sudo systemctl status httpd
```


## Verification

Confirm everything is working by updating the AWStats database and checking Apache:

```bash
# Build or update statistics for the example.com profile
sudo /usr/share/awstats/wwwroot/cgi-bin/awstats.pl -config=example.com -update

# Check Apache status
sudo systemctl status httpd

# Review recent Apache logs
journalctl -u httpd --no-pager -n 20
```

Then open `http://server.example.com/awstats/awstats.pl?config=example.com` in a browser, replacing the host name and configuration name for your environment.

## Troubleshooting

- If Apache fails to start, check the logs with `journalctl -u httpd -e --no-pager`.
- Ensure all required packages are installed: `rpm -q awstats httpd`.
- If AWStats does not show data, confirm that `LogFile` points to an existing readable access log and run `/usr/share/awstats/wwwroot/cgi-bin/awstats.pl -config=example.com -update` again.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
