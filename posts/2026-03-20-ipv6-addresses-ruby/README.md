# How to Handle IPv6 Addresses in Ruby Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ruby, IPv6, Networking, Socket Programming, IPAddr, Development

Description: Handle, validate, parse, and use IPv6 addresses in Ruby applications using the IPAddr class and socket libraries for both client and server networking.

## Introduction

Ruby provides IPv6 support through the `IPAddr` class in the standard library and the `Socket` class for network programming. Ruby on Rails and Rack applications also need specific consideration for IPv6 client handling in middleware and request processing.

## Using the IPAddr Class

```ruby
require 'ipaddr'

# Parse and validate IPv6 addresses

addr = IPAddr.new('2001:db8::1')
puts addr            # 2001:db8::1
puts addr.ipv6?      # true
puts addr.ipv4?      # false

# Validate addresses safely
def valid_ipv6?(address)
  IPAddr.new(address).ipv6?
rescue IPAddr::InvalidAddressError, IPAddr::AddressFamilyError
  false
end

test_cases = [
  '2001:db8::1',
  '::1',
  'fe80::1%eth0',
  '192.168.1.1',
  'not-an-address'
]

test_cases.each do |addr|
  puts "#{addr}: #{valid_ipv6?(addr)}"
end
```

## IPv6 Network Membership Testing

```ruby
require 'ipaddr'

# Create a network
network = IPAddr.new('2001:db8::/32')

# Test membership
addresses = ['2001:db8::1', '2001:db8:cafe::1', '2001:db9::1']
addresses.each do |addr_str|
  addr = IPAddr.new(addr_str)
  puts "#{addr_str} in #{network}: #{network.include?(addr)}"
end

# Compare addresses
addr1 = IPAddr.new('2001:db8::1')
addr2 = IPAddr.new('2001:db8::2')
puts addr1 < addr2   # true
puts addr1 == addr2  # false
```

## Creating an IPv6 TCP Server

```ruby
require 'socket'

# TCPServer with IPv6 wildcard address
server = TCPServer.new('::', 8080)
puts "IPv6 server listening on [::]:8080"

loop do
  client = server.accept

  # peeraddr returns [family, port, hostname, ip_address]
  family, port, hostname, ip = client.peeraddr
  puts "Connection from [#{ip}]:#{port} (#{family})"

  client.puts "Hello from IPv6 Ruby server"
  client.close
end
```

## Connecting to an IPv6 Server

```ruby
require 'socket'

# Connect to an IPv6 server
begin
  # TCPSocket accepts IPv6 addresses directly
  client = TCPSocket.new('2001:db8::1', 8080)
  puts "Connected to #{client.peeraddr[3]}"

  response = client.gets
  puts "Server: #{response}"
  client.close
rescue SocketError, SystemCallError => e
  puts "Connection failed: #{e.message}"
end
```

## Making HTTP Requests to IPv6 Hosts

```ruby
require 'net/http'
require 'uri'

# HTTP request to an IPv6 address
# IPv6 addresses in URIs must be in brackets
uri = URI('http://[2001:db8::1]:8080/api/status')

Net::HTTP.start(uri.hostname, uri.port) do |http|
  request = Net::HTTP::Get.new(uri.request_uri)
  response = http.request(request)

  puts "Status: #{response.code}"
  puts "Body: #{response.body}"
end

# With HTTPS
uri = URI('https://[2001:db8::1]:443/api/v1')
Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
  response = http.get(uri.request_uri)
  puts response.body
end
```

## Handling IPv6 in Rails/Rack

```ruby
require 'ipaddr'

# config/application.rb or middleware
# Get real client IP handling IPv6 and proxies

class IPv6AwareMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)

    # Get client IP, handling IPv4-mapped IPv6
    client_ip = extract_client_ip(request)
    env['CLIENT_IPV6'] = client_ip if valid_ipv6?(client_ip)

    @app.call(env)
  end

  private

  def extract_client_ip(request)
    # Rack/Rails already handle forwarded headers based on proxy settings.
    IPAddr.new(request.ip).native.to_s
  rescue IPAddr::InvalidAddressError, IPAddr::AddressFamilyError
    request.ip
  end

  def valid_ipv6?(addr)
    return false unless addr
    IPAddr.new(addr).ipv6?
  rescue IPAddr::InvalidAddressError, IPAddr::AddressFamilyError
    false
  end
end
```

## Formatting IPv6 for URLs

```ruby
require 'ipaddr'

# Wrap IPv6 addresses in brackets for URL use
def format_for_url(addr_str)
  addr = IPAddr.new(addr_str)
  host = addr.to_s
  host = host.sub('%', '%25') if addr.ipv6? && addr.zone_id
  addr.ipv6? ? "[#{host}]" : host
rescue IPAddr::InvalidAddressError, IPAddr::AddressFamilyError
  addr_str
end

puts format_for_url('2001:db8::1')   # [2001:db8::1]
puts format_for_url('192.168.1.1')   # 192.168.1.1

# Build a full URL
host = format_for_url('2001:db8::1')
url = "https://#{host}:443/api/v1"
puts url  # https://[2001:db8::1]:443/api/v1
```

## DNS AAAA Lookup in Ruby

```ruby
require 'resolv'

# Look up AAAA records
hostname = 'ipv6.google.com'
Resolv::DNS.open do |dns|
  addresses = dns.getresources(hostname, Resolv::DNS::Resource::IN::AAAA)
  addresses.each do |record|
    puts "#{hostname} AAAA: #{record.address}"
  end
end
```

## Conclusion

Ruby's `IPAddr` class provides clean IPv6 validation and network membership testing. For server sockets, use `'::'` as the bind address for IPv6. HTTP clients need bracket notation in URIs, and Rack/Rails middleware should normalize IPv4-mapped IPv6 addresses when extracting real client IPs.
