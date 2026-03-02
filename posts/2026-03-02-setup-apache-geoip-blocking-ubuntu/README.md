# How to Set Up Apache with GeoIP Blocking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, GeoIP, Security, Web Server

Description: Configure Apache with GeoIP databases on Ubuntu to block or restrict access based on geographic location, reducing attack surface from high-risk regions.

---

GeoIP blocking lets you restrict access to your web server based on the geographic origin of requests. This is useful for reducing attack surface when your service is only intended for specific regions, blocking countries that are persistent sources of scanning and brute force attempts, or complying with regional data access restrictions.

## Choose a GeoIP Approach

Two main options exist for Apache GeoIP blocking:

1. **mod_geoip2** with MaxMind GeoIP2 databases - the modern approach using the MaxMind GeoIP2 API
2. **GeoIP lookup via Nginx or a proxy** - if you already have Nginx in front of Apache

This guide covers mod_geoip2 with MaxMind's free GeoLite2 database, which is accurate enough for most use cases.

## Get MaxMind GeoLite2 Database

MaxMind requires a free account to download GeoLite2 databases:

```bash
# Install the MaxMind database updater
sudo add-apt-repository ppa:maxmind/ppa
sudo apt-get update
sudo apt-get install -y geoipupdate

# Configure with your MaxMind account ID and license key
# Sign up free at maxmind.com to get these credentials
sudo nano /etc/GeoIP.conf
```

```
# MaxMind account configuration
AccountID YOUR_ACCOUNT_ID
LicenseKey YOUR_LICENSE_KEY
EditionIDs GeoLite2-Country GeoLite2-City
```

```bash
# Download the databases
sudo geoipupdate

# Verify the databases downloaded
ls -la /var/lib/GeoIP/
# Should show GeoLite2-Country.mmdb and GeoLite2-City.mmdb

# Set up automatic weekly updates via cron
echo "0 2 * * 3 root geoipupdate" | sudo tee /etc/cron.d/geoipupdate
```

## Install mod_geoip2

The MaxMind GeoIP2 Apache module is not in Ubuntu's default repositories, but can be installed from source or via alternative methods:

```bash
# Install dependencies
sudo apt-get install -y apache2-dev libmaxminddb-dev libmaxminddb0

# Install from the Ubuntu universe repository (available on 20.04+)
sudo apt-get install -y libapache2-mod-geoip

# Note: The older mod_geoip uses the legacy GeoIP (v1) database format
# For GeoIP2 format (.mmdb), you may need to build mod_maxminddb from source
# or use a different approach shown below
```

### Alternative: Use mod_maxminddb

```bash
# Download and compile mod_maxminddb for GeoIP2 support
sudo apt-get install -y apache2-dev
wget https://github.com/maxmind/mod_maxminddb/releases/latest/download/mod_maxminddb-1.2.0.tar.gz
tar xzf mod_maxminddb-1.2.0.tar.gz
cd mod_maxminddb-1.2.0
sudo make install
sudo echo "LoadModule maxminddb_module /usr/lib/apache2/modules/mod_maxminddb.so" \
    > /etc/apache2/mods-available/maxminddb.load
sudo a2enmod maxminddb
sudo systemctl restart apache2
```

## Configure GeoIP Blocking

Create a configuration file for GeoIP settings:

```bash
sudo nano /etc/apache2/conf-available/geoip.conf
```

Using the legacy mod_geoip (GeoIP v1 format):

```apache
<IfModule mod_geoip.c>
    # Enable the GeoIP module
    GeoIPEnable On

    # Path to the GeoIP country database
    GeoIPDBFile /usr/share/GeoIP/GeoIP.dat MemoryCache

    # Enable country lookup
    GeoIPOutput All
</IfModule>
```

Using mod_maxminddb (GeoIP2 .mmdb format):

```apache
<IfModule maxminddb_module>
    # Load the GeoLite2 country database
    MaxMindDBEnable On
    MaxMindDBFile COUNTRY_DB /var/lib/GeoIP/GeoLite2-Country.mmdb

    # Map the database lookup results to environment variables
    MaxMindDBEnv GEOIP_COUNTRY_CODE COUNTRY_DB/country/iso_code
</IfModule>
```

```bash
sudo a2enconf geoip
sudo systemctl reload apache2
```

## Block Specific Countries

### Method 1: Allow Only Specific Countries (Allowlist)

```apache
<VirtualHost *:443>
    ServerName example.com

    # Set up GeoIP lookup
    MaxMindDBEnable On
    MaxMindDBFile COUNTRY_DB /var/lib/GeoIP/GeoLite2-Country.mmdb
    MaxMindDBEnv GEOIP_COUNTRY_CODE COUNTRY_DB/country/iso_code

    # Block everything except the US and Canada
    SetEnvIf GEOIP_COUNTRY_CODE ^(US|CA)$ AllowedCountry

    <Location "/">
        Order deny,allow
        Deny from all
        Allow from env=AllowedCountry

        # Always allow local and trusted IPs regardless of GeoIP
        Allow from 127.0.0.1
        Allow from 10.0.0.0/8
        Allow from 192.168.0.0/16
    </Location>
</VirtualHost>
```

### Method 2: Block Specific Countries (Blocklist)

```apache
<VirtualHost *:443>
    ServerName example.com

    MaxMindDBEnable On
    MaxMindDBFile COUNTRY_DB /var/lib/GeoIP/GeoLite2-Country.mmdb
    MaxMindDBEnv GEOIP_COUNTRY_CODE COUNTRY_DB/country/iso_code

    # Set environment variable if the country is in the blocklist
    SetEnvIf GEOIP_COUNTRY_CODE ^(CN|RU|KP|IR)$ BlockedCountry

    <Location "/">
        Order allow,deny
        Allow from all
        Deny from env=BlockedCountry

        # Never block monitoring and health check IPs
        Allow from 10.0.0.0/8
    </Location>
</VirtualHost>
```

### Method 3: Redirect Blocked Countries

Instead of a 403 error, redirect blocked countries to an informational page:

```apache
RewriteEngine On

# Set a variable based on country
MaxMindDBEnable On
MaxMindDBFile COUNTRY_DB /var/lib/GeoIP/GeoLite2-Country.mmdb
MaxMindDBEnv GEOIP_COUNTRY_CODE COUNTRY_DB/country/iso_code

# Redirect blocked countries to a geo-restriction notice
RewriteCond %{ENV:GEOIP_COUNTRY_CODE} ^(CN|RU)$
RewriteRule ^ /geo-restricted.html [R=302,L]
```

## Use Apache Expressions for Flexible Rules

Apache's expression engine offers more flexible matching:

```apache
<Location "/">
    # Block based on country with exception for admin paths
    <If "reqenv('GEOIP_COUNTRY_CODE') =~ /^(CN|RU|KP)$/ && %{REQUEST_URI} !~ m#^/admin#">
        Require all denied
    </If>
</Location>
```

## Block at the UFW Level Based on GeoIP

For more complete blocking (at the network level rather than just HTTP), use a GeoIP-based script to populate UFW rules:

```bash
# Install geoip-bin for command-line country lookups
sudo apt-get install -y geoip-bin

# Script to block all IPs from a country using UFW
sudo nano /usr/local/bin/block-country.sh
```

```bash
#!/bin/bash
# Block all IP ranges for a specific country code
# Requires: geoip-bin, ipset, ufw

COUNTRY="${1^^}"  # Convert to uppercase

if [[ -z "$COUNTRY" ]]; then
    echo "Usage: $0 <country_code>"
    exit 1
fi

echo "Blocking IP ranges for country: $COUNTRY"

# Use geoiplookup to find IP ranges (limited approach)
# Better: use a GeoIP IP block list from ipdeny.com
wget -q "http://www.ipdeny.com/ipblocks/data/countries/${COUNTRY,,}.zone" \
    -O "/tmp/${COUNTRY,,}.zone"

if [[ ! -s "/tmp/${COUNTRY,,}.zone" ]]; then
    echo "No IP range data found for $COUNTRY"
    exit 1
fi

# Add each range to UFW
while read -r range; do
    ufw insert 1 deny from "$range" to any comment "GeoBlock: $COUNTRY"
done < "/tmp/${COUNTRY,,}.zone"

echo "Done. Blocked $(wc -l < "/tmp/${COUNTRY,,}.zone") ranges for $COUNTRY"
```

```bash
sudo chmod +x /usr/local/bin/block-country.sh

# Block China at the firewall level
sudo /usr/local/bin/block-country.sh CN
```

## Verify GeoIP is Working

```bash
# Test by simulating a request from a specific IP
# Use a VPN or proxy to test from a blocked country

# Check what country an IP maps to
geoiplookup 1.2.3.4

# View the country code in Apache environment
# Add this temporarily for debugging:
# Header always set X-GeoIP-Country "%{GEOIP_COUNTRY_CODE}e"
# Then: curl -I https://example.com | grep X-GeoIP

# Check Apache error log for GeoIP issues
sudo tail -f /var/log/apache2/error.log | grep -i geo
```

## Considerations and Caveats

GeoIP blocking is not foolproof:

- VPNs and proxies allow users to bypass geographic restrictions easily
- Accuracy of country databases is typically 95 to 99 percent, not 100 percent
- Cloud providers and CDNs often appear with US or European IPs regardless of actual user location
- Blocking entire countries may block legitimate users who happen to have an IP assigned in that region

Use GeoIP blocking as a tool to reduce attack surface and noise, not as a guarantee of geographic access control. For compliance purposes (like OFAC sanctions), consult with legal counsel on what technical measures are sufficient.
