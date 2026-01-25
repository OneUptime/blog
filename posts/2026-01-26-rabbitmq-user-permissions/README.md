# How to Configure User Permissions in RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Security, User Management, Permissions, Access Control, DevOps

Description: A comprehensive guide to configuring user permissions in RabbitMQ, including virtual hosts, permission patterns, and best practices for multi-tenant environments.

---

The default RabbitMQ installation comes with a guest user that has full access. That is fine for development, but production needs proper access control. Users should have only the permissions they need - publishers should not delete queues, monitoring should not consume messages, and each application should be isolated in its own virtual host.

## Understanding RabbitMQ Permissions

RabbitMQ permissions operate at three levels:

1. **Users**: Authentication identity
2. **Virtual Hosts**: Namespace isolation
3. **Permissions**: What a user can do in a vhost

```mermaid
flowchart TB
    subgraph Users["Users"]
        U1[admin]
        U2[app_producer]
        U3[app_consumer]
        U4[monitoring]
    end

    subgraph VHosts["Virtual Hosts"]
        V1[/production]
        V2[/staging]
        V3[/]
    end

    subgraph Permissions["Permission Types"]
        P1[configure]
        P2[write]
        P3[read]
    end

    U1 --> V1
    U1 --> V2
    U2 --> V1
    U3 --> V1
    U4 --> V1
    U4 --> V2
```

## Managing Users

### Create Users

```bash
# Create a new user
rabbitmqctl add_user myuser secretpassword

# Create user with hashed password (more secure)
rabbitmqctl add_user myuser --password-hash "hashed_value"

# List all users
rabbitmqctl list_users
```

### User Tags (Roles)

Tags define what a user can do in the management UI:

```bash
# Make user an administrator (full access to management UI)
rabbitmqctl set_user_tags myuser administrator

# Management access (read-only for most, manage own vhosts)
rabbitmqctl set_user_tags myuser management

# Monitoring access (read-only everything)
rabbitmqctl set_user_tags myuser monitoring

# Policymaker (can manage policies and parameters)
rabbitmqctl set_user_tags myuser policymaker

# Multiple tags
rabbitmqctl set_user_tags myuser monitoring policymaker

# Remove all tags (no management access)
rabbitmqctl set_user_tags myuser
```

### Change and Delete Users

```bash
# Change password
rabbitmqctl change_password myuser newpassword

# Delete user
rabbitmqctl delete_user myuser
```

## Managing Virtual Hosts

Virtual hosts provide complete isolation between applications.

### Create Virtual Hosts

```bash
# Create a virtual host
rabbitmqctl add_vhost /production
rabbitmqctl add_vhost /staging
rabbitmqctl add_vhost /team-a

# List virtual hosts
rabbitmqctl list_vhosts

# Delete virtual host (WARNING: deletes all queues/exchanges)
rabbitmqctl delete_vhost /old-vhost
```

### Virtual Host Limits

Set limits per vhost to prevent resource exhaustion:

```bash
# Limit max connections
rabbitmqctl set_vhost_limits -p /production '{"max-connections": 1000}'

# Limit max queues
rabbitmqctl set_vhost_limits -p /production '{"max-queues": 100}'

# Both limits
rabbitmqctl set_vhost_limits -p /production '{"max-connections": 1000, "max-queues": 100}'

# Remove limits
rabbitmqctl clear_vhost_limits -p /production
```

## Setting Permissions

Permissions control what users can do with resources (queues, exchanges, bindings).

### Permission Types

- **configure**: Create/delete queues and exchanges, modify bindings
- **write**: Publish messages to exchanges
- **read**: Consume messages from queues, bind queues to exchanges

### Setting Permissions

```bash
# Grant full access to a vhost
rabbitmqctl set_permissions -p /production myuser ".*" ".*" ".*"

# Pattern: set_permissions -p vhost user configure write read

# Read-only access (consume only)
rabbitmqctl set_permissions -p /production consumer_user "" "" ".*"

# Write-only access (publish only)
rabbitmqctl set_permissions -p /production producer_user "" ".*" ""

# Configure access to specific resources
rabbitmqctl set_permissions -p /production app_user "^app\\." "^app\\." "^app\\."
```

### Permission Patterns

Permissions use regular expressions:

```bash
# All resources
".*"

# No access
""

# Resources starting with "app."
"^app\\."

# Resources ending with ".events"
".*\\.events$"

# Specific resource name
"^orders$"

# Multiple specific resources
"^(orders|payments|shipping)$"
```

### View Permissions

```bash
# List permissions for a user
rabbitmqctl list_user_permissions myuser

# List permissions in a vhost
rabbitmqctl list_permissions -p /production
```

## Python API for User Management

```python
import requests
from requests.auth import HTTPBasicAuth

class RabbitMQAdmin:
    def __init__(self, host, admin_user, admin_password):
        self.base_url = f"http://{host}:15672/api"
        self.auth = HTTPBasicAuth(admin_user, admin_password)

    def create_user(self, username, password, tags=None):
        """Create a new user"""
        url = f"{self.base_url}/users/{username}"
        data = {
            "password": password,
            "tags": tags or ""
        }
        response = requests.put(url, json=data, auth=self.auth)
        return response.status_code in [201, 204]

    def delete_user(self, username):
        """Delete a user"""
        url = f"{self.base_url}/users/{username}"
        response = requests.delete(url, auth=self.auth)
        return response.status_code == 204

    def create_vhost(self, vhost):
        """Create a virtual host"""
        url = f"{self.base_url}/vhosts/{vhost}"
        response = requests.put(url, auth=self.auth)
        return response.status_code in [201, 204]

    def set_permissions(self, vhost, username, configure, write, read):
        """Set user permissions for a vhost"""
        vhost_encoded = vhost.replace('/', '%2f')
        url = f"{self.base_url}/permissions/{vhost_encoded}/{username}"
        data = {
            "configure": configure,
            "write": write,
            "read": read
        }
        response = requests.put(url, json=data, auth=self.auth)
        return response.status_code in [201, 204]

    def set_topic_permissions(self, vhost, username, exchange, write, read):
        """Set topic permissions for an exchange"""
        vhost_encoded = vhost.replace('/', '%2f')
        url = f"{self.base_url}/topic-permissions/{vhost_encoded}/{username}"
        data = {
            "exchange": exchange,
            "write": write,
            "read": read
        }
        response = requests.put(url, json=data, auth=self.auth)
        return response.status_code in [201, 204]

    def list_users(self):
        """List all users"""
        url = f"{self.base_url}/users"
        response = requests.get(url, auth=self.auth)
        return response.json()

# Usage
admin = RabbitMQAdmin('localhost', 'admin', 'password')

# Create application user
admin.create_user('order_service', 'order_pass_123', tags='')

# Create vhost
admin.create_vhost('production')

# Set permissions - order_service can only use order.* resources
admin.set_permissions(
    vhost='production',
    username='order_service',
    configure='^order\\.',
    write='^order\\.',
    read='^order\\.'
)
```

## Common Permission Patterns

### Pattern 1: Microservice Isolation

Each service gets its own user with access to its own resources:

```bash
# Order service
rabbitmqctl add_user order_service order_pass
rabbitmqctl set_permissions -p /production order_service \
    "^order\\." "^order\\." "^order\\."

# Payment service
rabbitmqctl add_user payment_service payment_pass
rabbitmqctl set_permissions -p /production payment_service \
    "^payment\\." "^payment\\." "^payment\\."

# Notification service (read from multiple, write to notification.*)
rabbitmqctl add_user notification_service notif_pass
rabbitmqctl set_permissions -p /production notification_service \
    "^notification\\." "^notification\\." "^(order|payment|notification)\\."
```

### Pattern 2: Publish-Subscribe Separation

```bash
# Publisher - can only write to exchanges
rabbitmqctl add_user event_publisher pub_pass
rabbitmqctl set_permissions -p /production event_publisher \
    "" "^events$" ""

# Subscriber - can create queues and read
rabbitmqctl add_user event_subscriber sub_pass
rabbitmqctl set_permissions -p /production event_subscriber \
    "^subscriber\\." "" "^(subscriber\\.|events$)"
```

### Pattern 3: Monitoring User

```bash
# Create monitoring user with read-only access
rabbitmqctl add_user monitoring mon_pass
rabbitmqctl set_user_tags monitoring monitoring

# Grant read access to all vhosts
for vhost in $(rabbitmqctl list_vhosts --quiet); do
    rabbitmqctl set_permissions -p "$vhost" monitoring "" "" ".*"
done
```

### Pattern 4: Admin vs Operator

```bash
# Full admin
rabbitmqctl add_user admin admin_pass
rabbitmqctl set_user_tags admin administrator
rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# Operator (can manage queues but not users)
rabbitmqctl add_user operator op_pass
rabbitmqctl set_user_tags operator management policymaker
rabbitmqctl set_permissions -p /production operator ".*" ".*" ".*"
```

## Topic Permissions

For topic exchanges, you can control which routing keys users can publish/subscribe to:

```bash
# Set topic permissions
rabbitmqctl set_topic_permissions -p /production myuser \
    events "^order\\." "^(order|payment)\\."

# Parameters: vhost user exchange write_pattern read_pattern
```

### Python Topic Permissions

```python
def setup_topic_permissions(admin):
    # Order service can publish order.* events
    admin.set_topic_permissions(
        vhost='production',
        username='order_service',
        exchange='events',
        write='^order\\.',
        read='^order\\.'
    )

    # Analytics can read all events but not publish
    admin.set_topic_permissions(
        vhost='production',
        username='analytics',
        exchange='events',
        write='',
        read='.*'
    )
```

## Security Best Practices

### 1. Remove or Disable Guest User

```bash
# Delete guest user
rabbitmqctl delete_user guest

# Or restrict guest to localhost only (rabbitmq.conf)
# loopback_users.guest = true
```

### 2. Use Strong Passwords

```bash
# Generate strong password
openssl rand -base64 32

# Set password
rabbitmqctl change_password myuser "$(openssl rand -base64 32)"
```

### 3. Principle of Least Privilege

```bash
# Give only the permissions needed
# Bad: Full access
rabbitmqctl set_permissions -p /production app_user ".*" ".*" ".*"

# Good: Specific access
rabbitmqctl set_permissions -p /production app_user \
    "^app_user\\." "^app_user\\." "^app_user\\."
```

### 4. Use Separate Vhosts

```bash
# Separate vhost per environment/team
rabbitmqctl add_vhost /prod-team-a
rabbitmqctl add_vhost /prod-team-b
rabbitmqctl add_vhost /staging
```

### 5. Audit User Access

```python
def audit_permissions(admin):
    """Generate permission audit report"""
    users = admin.list_users()

    print("User Permission Audit")
    print("=" * 60)

    for user in users:
        username = user['name']
        tags = user.get('tags', '')

        print(f"\nUser: {username}")
        print(f"Tags: {tags}")

        # Get permissions for each vhost
        perms_url = f"{admin.base_url}/users/{username}/permissions"
        response = requests.get(perms_url, auth=admin.auth)
        permissions = response.json()

        for perm in permissions:
            print(f"  Vhost: {perm['vhost']}")
            print(f"    Configure: {perm['configure']}")
            print(f"    Write: {perm['write']}")
            print(f"    Read: {perm['read']}")
```

### 6. External Authentication

For enterprise environments, integrate with LDAP or OAuth:

```ini
# rabbitmq.conf for LDAP
auth_backends.1 = ldap
auth_ldap.servers.1 = ldap.example.com
auth_ldap.user_dn_pattern = cn=${username},ou=users,dc=example,dc=com
```

## Troubleshooting

### Permission Denied Errors

```bash
# Check user exists
rabbitmqctl list_users | grep myuser

# Check permissions for user
rabbitmqctl list_user_permissions myuser

# Check permissions in vhost
rabbitmqctl list_permissions -p /production
```

### Test Permissions

```python
import pika

def test_permissions(host, vhost, user, password):
    """Test what operations a user can perform"""
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=host,
                virtual_host=vhost,
                credentials=pika.PlainCredentials(user, password)
            )
        )
        channel = connection.channel()

        # Test configure
        try:
            channel.queue_declare(queue='test_queue', auto_delete=True)
            print("Configure: ALLOWED")
        except:
            print("Configure: DENIED")

        # Test write
        try:
            channel.basic_publish(exchange='', routing_key='test_queue', body='test')
            print("Write: ALLOWED")
        except:
            print("Write: DENIED")

        # Test read
        try:
            channel.basic_get('test_queue')
            print("Read: ALLOWED")
        except:
            print("Read: DENIED")

        connection.close()
    except Exception as e:
        print(f"Connection failed: {e}")

test_permissions('localhost', '/production', 'app_user', 'password')
```

## Conclusion

Proper user management is essential for RabbitMQ security. Create users with specific purposes, isolate applications in virtual hosts, and grant only the permissions needed. Audit permissions regularly and never use the guest account in production. The extra setup time pays off in security and easier troubleshooting when you know exactly what each user can and cannot do.
