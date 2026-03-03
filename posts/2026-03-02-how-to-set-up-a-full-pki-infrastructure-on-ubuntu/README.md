# How to Set Up a Full PKI Infrastructure on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PKI, Security, TLS, Certificate Authority

Description: A complete guide to building a multi-tier Public Key Infrastructure on Ubuntu with a Root CA, Intermediate CA, and certificate issuance for securing internal services.

---

A Public Key Infrastructure (PKI) is the system of hardware, software, policies, and procedures needed to create, manage, distribute, and revoke digital certificates. Rather than relying on public CAs like Let's Encrypt for internal services - which requires them to be internet-accessible - you can build your own PKI to issue trusted certificates for internal hosts, APIs, mutual TLS authentication between services, and VPN clients.

A properly designed PKI uses a multi-tier hierarchy: an offline Root CA (kept airgapped), one or more Intermediate CAs (online, do the actual signing), and end-entity certificates. This design limits the blast radius if an intermediate CA is compromised - you revoke it and issue a new one from the offline Root without losing trust in other certificates.

## PKI Hierarchy

```text
Root CA (offline, air-gapped)
    |
    +-- Intermediate CA (online)
            |
            +-- Server certificates (for web servers, services)
            +-- Client certificates (for VPNs, mTLS)
            +-- Code signing certificates
```

## Setting Up the Root CA

The Root CA should be created on an offline system and never connected to a network. In practice for small organizations, a dedicated VM that you power off after use works adequately.

```bash
# Create directory structure for the Root CA
mkdir -p /opt/root-ca/{certs,crl,newcerts,private}
chmod 700 /opt/root-ca/private
touch /opt/root-ca/index.txt
echo 1000 > /opt/root-ca/serial
echo 1000 > /opt/root-ca/crlnumber

# Create Root CA OpenSSL configuration
cat > /opt/root-ca/openssl.cnf << 'EOF'
# Root CA configuration
[ ca ]
default_ca = CA_default

[ CA_default ]
dir               = /opt/root-ca
certs             = $dir/certs
crl_dir           = $dir/crl
new_certs_dir     = $dir/newcerts
database          = $dir/index.txt
serial            = $dir/serial
RANDFILE          = $dir/private/.rand
private_key       = $dir/private/root-ca.key
certificate       = $dir/certs/root-ca.crt
crl               = $dir/crl/root-ca.crl
crlnumber         = $dir/crlnumber
crl_extensions    = crl_ext
default_crl_days  = 365
default_md        = sha256
name_opt          = ca_default
cert_opt          = ca_default
default_days      = 3650
preserve          = no
policy            = policy_strict

[ policy_strict ]
countryName             = match
stateOrProvinceName     = match
organizationName        = match
organizationalUnitName  = optional
commonName              = supplied

[ req ]
default_bits        = 4096
distinguished_name  = req_distinguished_name
string_mask         = utf8only
default_md          = sha256
x509_extensions     = v3_ca

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
organizationName                = Organization Name
commonName                      = Common Name

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ v3_intermediate_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ crl_ext ]
authorityKeyIdentifier = keyid:always
EOF
```

Generate the Root CA key and self-signed certificate:

```bash
# Generate Root CA private key (protect this with a strong passphrase)
openssl genrsa -aes256 -out /opt/root-ca/private/root-ca.key 4096
chmod 400 /opt/root-ca/private/root-ca.key

# Generate the Root CA certificate (valid for 20 years)
openssl req -config /opt/root-ca/openssl.cnf \
    -key /opt/root-ca/private/root-ca.key \
    -new -x509 -days 7300 -sha256 -extensions v3_ca \
    -out /opt/root-ca/certs/root-ca.crt \
    -subj "/C=US/ST=California/O=Example Corp/CN=Example Corp Root CA"

# Verify the certificate
openssl x509 -noout -text -in /opt/root-ca/certs/root-ca.crt
```

## Setting Up the Intermediate CA

The Intermediate CA lives on a server that is online but access-controlled:

```bash
# Create Intermediate CA directory structure
mkdir -p /opt/intermediate-ca/{certs,crl,csr,newcerts,private}
chmod 700 /opt/intermediate-ca/private
touch /opt/intermediate-ca/index.txt
echo 1000 > /opt/intermediate-ca/serial
echo 1000 > /opt/intermediate-ca/crlnumber

# Intermediate CA configuration
cat > /opt/intermediate-ca/openssl.cnf << 'EOF'
[ ca ]
default_ca = CA_default

[ CA_default ]
dir               = /opt/intermediate-ca
certs             = $dir/certs
crl_dir           = $dir/crl
new_certs_dir     = $dir/newcerts
database          = $dir/index.txt
serial            = $dir/serial
RANDFILE          = $dir/private/.rand
private_key       = $dir/private/intermediate-ca.key
certificate       = $dir/certs/intermediate-ca.crt
crl               = $dir/crl/intermediate.crl
crlnumber         = $dir/crlnumber
crl_extensions    = crl_ext
default_crl_days  = 30
default_md        = sha256
name_opt          = ca_default
cert_opt          = ca_default
default_days      = 375
preserve          = no
policy            = policy_loose

[ policy_loose ]
countryName             = optional
stateOrProvinceName     = optional
organizationName        = optional
organizationalUnitName  = optional
commonName              = supplied

[ req ]
default_bits        = 2048
distinguished_name  = req_distinguished_name
string_mask         = utf8only
default_md          = sha256

[ req_distinguished_name ]
countryName             = Country Name (2 letter code)
stateOrProvinceName     = State
organizationName        = Organization Name
commonName              = Common Name

[ server_cert ]
basicConstraints = CA:FALSE
nsCertType = server
nsComment = "OpenSSL Generated Server Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[ client_cert ]
basicConstraints = CA:FALSE
nsCertType = client
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
keyUsage = critical, digitalSignature
extendedKeyUsage = clientAuth

[ crl_ext ]
authorityKeyIdentifier = keyid:always
EOF
```

Generate the Intermediate CA key and CSR:

```bash
# Generate Intermediate CA private key
openssl genrsa -aes256 -out /opt/intermediate-ca/private/intermediate-ca.key 4096
chmod 400 /opt/intermediate-ca/private/intermediate-ca.key

# Generate CSR for the Intermediate CA
openssl req -config /opt/intermediate-ca/openssl.cnf \
    -key /opt/intermediate-ca/private/intermediate-ca.key \
    -new -sha256 \
    -out /opt/intermediate-ca/csr/intermediate-ca.csr \
    -subj "/C=US/ST=California/O=Example Corp/CN=Example Corp Intermediate CA"
```

Sign the Intermediate CA CSR with the Root CA:

```bash
# On the Root CA system (or transfer the CSR there)
cp /opt/intermediate-ca/csr/intermediate-ca.csr /opt/root-ca/csr/

openssl ca -config /opt/root-ca/openssl.cnf \
    -extensions v3_intermediate_ca \
    -days 3650 -notext -md sha256 \
    -in /opt/root-ca/csr/intermediate-ca.csr \
    -out /opt/root-ca/certs/intermediate-ca.crt

# Copy signed cert back to Intermediate CA
cp /opt/root-ca/certs/intermediate-ca.crt /opt/intermediate-ca/certs/

# Create the certificate chain file
cat /opt/intermediate-ca/certs/intermediate-ca.crt \
    /opt/root-ca/certs/root-ca.crt > /opt/intermediate-ca/certs/ca-chain.crt
```

## Issuing Server Certificates

Now issue certificates from the Intermediate CA:

```bash
# Generate a server certificate for web.example.com
openssl genrsa -out /opt/intermediate-ca/private/web.example.com.key 2048
chmod 400 /opt/intermediate-ca/private/web.example.com.key

# Create CSR with Subject Alternative Names
openssl req -config /opt/intermediate-ca/openssl.cnf \
    -key /opt/intermediate-ca/private/web.example.com.key \
    -new -sha256 \
    -out /opt/intermediate-ca/csr/web.example.com.csr \
    -subj "/C=US/ST=California/O=Example Corp/CN=web.example.com" \
    -reqexts SAN \
    -config <(cat /opt/intermediate-ca/openssl.cnf; printf "\n[SAN]\nsubjectAltName=DNS:web.example.com,DNS:*.example.com")

# Sign the certificate
openssl ca -config /opt/intermediate-ca/openssl.cnf \
    -extensions server_cert -days 375 -notext -md sha256 \
    -in /opt/intermediate-ca/csr/web.example.com.csr \
    -out /opt/intermediate-ca/certs/web.example.com.crt

# Verify the signed certificate
openssl x509 -noout -text -in /opt/intermediate-ca/certs/web.example.com.crt
openssl verify -CAfile /opt/intermediate-ca/certs/ca-chain.crt \
    /opt/intermediate-ca/certs/web.example.com.crt
```

## Distributing the Root CA Certificate

For browsers and OS to trust your certificates, install the Root CA:

```bash
# On Ubuntu clients
sudo cp /opt/root-ca/certs/root-ca.crt /usr/local/share/ca-certificates/example-corp-root-ca.crt
sudo update-ca-certificates

# Verify the CA is trusted
openssl verify -CApath /etc/ssl/certs /opt/intermediate-ca/certs/web.example.com.crt
```

## Automating Certificate Renewal

Create a script to track expiring certificates:

```bash
#!/bin/bash
# Check certificates expiring within 30 days
CERT_DIR="/opt/intermediate-ca/certs"
THRESHOLD=30

for cert in "$CERT_DIR"/*.crt; do
    if [ -f "$cert" ]; then
        expiry=$(openssl x509 -noout -enddate -in "$cert" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry" +%s)
        now_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

        if [ $days_left -lt $THRESHOLD ]; then
            echo "WARNING: $cert expires in $days_left days ($expiry)"
        fi
    fi
done
```

With this PKI in place, you can issue trusted certificates for any internal service without relying on external certificate authorities or exposing your services to the internet for domain validation.
