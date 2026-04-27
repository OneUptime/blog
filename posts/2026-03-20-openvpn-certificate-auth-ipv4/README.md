# How to Set Up OpenVPN with Certificate-Based Authentication for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, VPN, IPv4, PKI, TLS, Certificate Authentication

Description: Generate client certificates with Easy-RSA and create OpenVPN client configuration files for secure certificate-based IPv4 VPN access.

Certificate-based authentication is more secure than passwords because the private key never leaves the client device. Each VPN user receives a unique certificate signed by your CA.

## Step 1: Generate a Client Certificate

On the server, in your Easy-RSA directory:

```bash
cd ~/openvpn-ca

# Generate a client key and certificate signing request

# Replace "client1" with the user's name
./easyrsa gen-req client1 nopass

# Sign the client certificate with the CA
./easyrsa sign-req client client1
```

## Step 2: Collect the Required Files

For each client you need these four files:

```text
ca.crt          - The CA certificate (shared by all clients)
client1.crt     - The client's certificate
client1.key     - The client's private key
ta.key          - TLS authentication key
```

```bash
# Copy to a staging directory for distribution
mkdir ~/client1-config
cp ~/openvpn-ca/pki/ca.crt ~/client1-config/
cp ~/openvpn-ca/pki/issued/client1.crt ~/client1-config/
cp ~/openvpn-ca/pki/private/client1.key ~/client1-config/
cp ~/openvpn-ca/pki/ta.key ~/client1-config/
```

## Step 3: Create the Client Configuration File

The easiest approach is an inline configuration that embeds the certificates directly in the `.ovpn` file:

```bash
cat > ~/client1-config/client1.ovpn << 'EOF'
client
dev tun
proto udp

# Server's public IP and port
remote 203.0.113.1 1194

resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-CBC
verb 3

# Inline certificates (embedded for portability)
<ca>
EOF

# Append the CA certificate inline
cat ~/client1-config/ca.crt >> ~/client1-config/client1.ovpn
echo "</ca>" >> ~/client1-config/client1.ovpn

echo "<cert>" >> ~/client1-config/client1.ovpn
cat ~/client1-config/client1.crt >> ~/client1-config/client1.ovpn
echo "</cert>" >> ~/client1-config/client1.ovpn

echo "<key>" >> ~/client1-config/client1.ovpn
cat ~/client1-config/client1.key >> ~/client1-config/client1.ovpn
echo "</key>" >> ~/client1-config/client1.ovpn

echo "key-direction 1" >> ~/client1-config/client1.ovpn
echo "<tls-auth>" >> ~/client1-config/client1.ovpn
cat ~/client1-config/ta.key >> ~/client1-config/client1.ovpn
echo "</tls-auth>" >> ~/client1-config/client1.ovpn
```

## Step 4: Connect the Client

On Linux:

```bash
sudo openvpn --config client1.ovpn
```

On Windows or macOS, import `client1.ovpn` into the OpenVPN Connect client.

## Step 5: Revoking a Certificate

If a client's certificate is compromised:

```bash
cd ~/openvpn-ca

# Revoke the certificate
./easyrsa revoke client1

# Generate a new CRL
./easyrsa gen-crl

# Copy the CRL to OpenVPN and reference it in server.conf
sudo cp ~/openvpn-ca/pki/crl.pem /etc/openvpn/server/
```

Add to `/etc/openvpn/server/server.conf`:

```conf
# Enable certificate revocation list checking
crl-verify /etc/openvpn/server/crl.pem
```

```bash
sudo systemctl restart openvpn-server@server
```

Certificate-based authentication provides per-user accountability and immediate revocation capability, making it the preferred method for production OpenVPN deployments.
