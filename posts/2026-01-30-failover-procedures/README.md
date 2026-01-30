# How to Implement Failover Procedures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Disaster Recovery, High Availability, Failover, SRE

Description: Learn how to implement and test failover procedures for seamless recovery.

---

Failover procedures are critical components of any high availability architecture. When primary systems fail, having well-designed failover mechanisms ensures your services remain operational with minimal disruption. This guide covers the essential strategies, implementation patterns, and runbook templates you need to build resilient systems.

## Understanding Failover Types

Before diving into implementation, it is important to understand the two primary failover approaches: automatic and manual.

### Automatic Failover

Automatic failover systems detect failures and switch to backup resources without human intervention. They are ideal for scenarios requiring near-zero downtime.

```mermaid
flowchart TD
    A[Health Check Monitor] --> B{Primary Healthy?}
    B -->|Yes| C[Route to Primary]
    B -->|No| D[Trigger Failover]
    D --> E[Update Load Balancer]
    E --> F[Route to Secondary]
    F --> G[Send Alert to Team]
    G --> H[Log Failover Event]
```

**Advantages:**
- Minimal downtime (typically seconds)
- No human intervention required
- Consistent response time

**Disadvantages:**
- Risk of false positives triggering unnecessary failovers
- More complex to implement
- Potential for split-brain scenarios

### Manual Failover

Manual failover requires human decision-making before switching to backup systems. This approach provides more control but increases recovery time.

```mermaid
flowchart TD
    A[Alert Received] --> B[Engineer Investigates]
    B --> C{Failover Required?}
    C -->|No| D[Fix Primary System]
    C -->|Yes| E[Execute Runbook]
    E --> F[Verify Secondary Ready]
    F --> G[Switch Traffic]
    G --> H[Confirm Service Health]
    H --> I[Document Incident]
```

**Advantages:**
- Human verification prevents false positives
- More control over timing
- Simpler implementation

**Disadvantages:**
- Longer recovery time
- Requires on-call staff availability
- Human error potential

## DNS Failover Implementation

DNS failover is one of the most common strategies for redirecting traffic during outages. It works by updating DNS records to point to healthy endpoints.

### Architecture Overview

```mermaid
flowchart LR
    subgraph DNS Provider
        A[DNS Records]
        B[Health Checker]
    end

    subgraph Primary Region
        C[Load Balancer]
        D[Application Servers]
    end

    subgraph Secondary Region
        E[Load Balancer]
        F[Application Servers]
    end

    B --> C
    B --> E
    A --> C
    A -.->|Failover| E
```

### Implementation with Route 53

Here is a complete example using AWS Route 53 with health checks:

```python
# dns_failover.py
# Configures DNS failover using AWS Route 53 with health checks

import boto3
from botocore.exceptions import ClientError
import logging

# Configure logging for monitoring and debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DNSFailoverManager:
    """
    Manages DNS failover configuration using AWS Route 53.

    This class provides methods to create health checks and configure
    failover routing policies between primary and secondary endpoints.
    """

    def __init__(self, hosted_zone_id: str):
        """
        Initialize the DNS Failover Manager.

        Args:
            hosted_zone_id: The Route 53 hosted zone ID for your domain
        """
        self.route53 = boto3.client('route53')
        self.hosted_zone_id = hosted_zone_id

    def create_health_check(
        self,
        endpoint_ip: str,
        endpoint_port: int,
        endpoint_path: str,
        check_name: str
    ) -> str:
        """
        Create a health check for an endpoint.

        The health check monitors the endpoint and marks it unhealthy
        if it fails to respond correctly within the threshold.

        Args:
            endpoint_ip: IP address of the endpoint to monitor
            endpoint_port: Port number for health checks
            endpoint_path: HTTP path to check (e.g., /health)
            check_name: Descriptive name for the health check

        Returns:
            The health check ID for use in DNS records
        """
        try:
            response = self.route53.create_health_check(
                CallerReference=f"{check_name}-{endpoint_ip}",
                HealthCheckConfig={
                    # Monitor the endpoint IP directly
                    'IPAddress': endpoint_ip,
                    'Port': endpoint_port,
                    'Type': 'HTTP',
                    'ResourcePath': endpoint_path,

                    # Health check timing configuration
                    # Request interval: 30 seconds between checks
                    'RequestInterval': 30,

                    # Failure threshold: 3 consecutive failures = unhealthy
                    'FailureThreshold': 3,

                    # Enable latency measurement for monitoring
                    'MeasureLatency': True,

                    # Check from multiple regions for reliability
                    'Regions': [
                        'us-east-1',
                        'us-west-2',
                        'eu-west-1'
                    ]
                }
            )

            health_check_id = response['HealthCheck']['Id']
            logger.info(f"Created health check: {health_check_id}")

            # Add a name tag for easier identification
            self.route53.change_tags_for_resource(
                ResourceType='healthcheck',
                ResourceId=health_check_id,
                AddTags=[{'Key': 'Name', 'Value': check_name}]
            )

            return health_check_id

        except ClientError as e:
            logger.error(f"Failed to create health check: {e}")
            raise

    def configure_failover_records(
        self,
        domain_name: str,
        primary_ip: str,
        secondary_ip: str,
        primary_health_check_id: str,
        ttl: int = 60
    ) -> None:
        """
        Configure primary and secondary DNS records with failover routing.

        This sets up the DNS records so that traffic automatically
        routes to the secondary IP when the primary becomes unhealthy.

        Args:
            domain_name: The domain name (e.g., api.example.com)
            primary_ip: IP address of the primary endpoint
            secondary_ip: IP address of the secondary endpoint
            primary_health_check_id: Health check ID for primary endpoint
            ttl: Time-to-live for DNS records (lower = faster failover)
        """
        try:
            # Create both primary and secondary records in a single batch
            self.route53.change_resource_record_sets(
                HostedZoneId=self.hosted_zone_id,
                ChangeBatch={
                    'Comment': f'Failover configuration for {domain_name}',
                    'Changes': [
                        # Primary record - used when health check passes
                        {
                            'Action': 'UPSERT',
                            'ResourceRecordSet': {
                                'Name': domain_name,
                                'Type': 'A',
                                'SetIdentifier': 'primary',

                                # Failover routing policy
                                'Failover': 'PRIMARY',

                                # Associate with health check
                                'HealthCheckId': primary_health_check_id,

                                # Low TTL enables faster failover
                                'TTL': ttl,

                                'ResourceRecords': [{'Value': primary_ip}]
                            }
                        },
                        # Secondary record - used when primary is unhealthy
                        {
                            'Action': 'UPSERT',
                            'ResourceRecordSet': {
                                'Name': domain_name,
                                'Type': 'A',
                                'SetIdentifier': 'secondary',

                                # Secondary does not need health check
                                # (assumes secondary is always available)
                                'Failover': 'SECONDARY',

                                'TTL': ttl,

                                'ResourceRecords': [{'Value': secondary_ip}]
                            }
                        }
                    ]
                }
            )

            logger.info(f"Configured failover for {domain_name}")

        except ClientError as e:
            logger.error(f"Failed to configure failover records: {e}")
            raise


# Example usage
if __name__ == "__main__":
    # Initialize the manager with your hosted zone
    manager = DNSFailoverManager(hosted_zone_id="Z1234567890ABC")

    # Create health check for primary endpoint
    health_check_id = manager.create_health_check(
        endpoint_ip="10.0.1.100",
        endpoint_port=443,
        endpoint_path="/health",
        check_name="api-primary-health"
    )

    # Configure failover DNS records
    manager.configure_failover_records(
        domain_name="api.example.com",
        primary_ip="10.0.1.100",
        secondary_ip="10.0.2.100",
        primary_health_check_id=health_check_id,
        ttl=60  # 60 second TTL for faster failover
    )
```

### DNS Failover Considerations

When implementing DNS failover, keep these factors in mind:

| Factor | Recommendation |
|--------|----------------|
| TTL Value | 60 seconds or less for faster failover |
| Health Check Interval | 10-30 seconds depending on criticality |
| Failure Threshold | 2-3 failures to avoid false positives |
| Check Regions | Use 3+ regions for reliable detection |

## Database Failover Strategies

Database failover is often the most complex component of high availability architectures. Different database systems require different approaches.

### PostgreSQL Failover with Patroni

Patroni is a battle-tested solution for PostgreSQL high availability. It handles leader election, replication management, and automatic failover.

```mermaid
flowchart TB
    subgraph Consensus Layer
        E1[etcd Node 1]
        E2[etcd Node 2]
        E3[etcd Node 3]
    end

    subgraph PostgreSQL Cluster
        P1[Patroni + PostgreSQL Primary]
        P2[Patroni + PostgreSQL Replica]
        P3[Patroni + PostgreSQL Replica]
    end

    subgraph Load Balancer
        H[HAProxy]
    end

    P1 <--> E1
    P1 <--> E2
    P1 <--> E3
    P2 <--> E1
    P2 <--> E2
    P2 <--> E3
    P3 <--> E1
    P3 <--> E2
    P3 <--> E3

    H --> P1
    H -.->|Failover| P2
    H -.->|Failover| P3
```

Here is a Patroni configuration for automatic PostgreSQL failover:

```yaml
# patroni.yml
# Configuration for Patroni PostgreSQL high availability cluster

# Cluster scope - all nodes in the cluster share this name
scope: postgres-cluster

# Unique name for this node
name: postgres-node-1

# REST API configuration for health checks and management
restapi:
  listen: 0.0.0.0:8008
  connect_address: postgres-node-1.internal:8008

  # Authentication for API access
  authentication:
    username: patroni
    password: "${PATRONI_API_PASSWORD}"

# Distributed consensus store configuration
# etcd is used for leader election and cluster state
etcd3:
  hosts:
    - etcd-1.internal:2379
    - etcd-2.internal:2379
    - etcd-3.internal:2379

  # Authentication for etcd access
  username: patroni
  password: "${ETCD_PASSWORD}"

# Bootstrap configuration - used when initializing a new cluster
bootstrap:
  # Distributed consensus settings
  dcs:
    # Time-to-live for leader lock (seconds)
    # If leader does not renew within this time, failover begins
    ttl: 30

    # How often to update the leader lock
    loop_wait: 10

    # Timeout for acquiring the leader lock during failover
    retry_timeout: 10

    # Maximum lag allowed before replica is considered unhealthy
    maximum_lag_on_failover: 1048576  # 1MB

    # PostgreSQL parameters applied cluster-wide
    postgresql:
      use_pg_rewind: true  # Enable pg_rewind for faster rejoin
      use_slots: true       # Use replication slots

      parameters:
        # Replication settings for high availability
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB

        # Synchronous replication for zero data loss
        # Set to empty string for async (faster but potential data loss)
        synchronous_commit: "on"
        synchronous_standby_names: "*"

  # Initialization method for new cluster
  initdb:
    - encoding: UTF8
    - data-checksums  # Enable checksums for data integrity

# PostgreSQL connection configuration
postgresql:
  listen: 0.0.0.0:5432
  connect_address: postgres-node-1.internal:5432

  # Data directory location
  data_dir: /var/lib/postgresql/data

  # Binary locations
  bin_dir: /usr/lib/postgresql/15/bin

  # Authentication configuration
  authentication:
    superuser:
      username: postgres
      password: "${POSTGRES_PASSWORD}"
    replication:
      username: replicator
      password: "${REPLICATION_PASSWORD}"
    rewind:
      username: rewind_user
      password: "${REWIND_PASSWORD}"

  # pg_hba.conf entries for replication
  pg_hba:
    - host replication replicator 10.0.0.0/8 md5
    - host all all 10.0.0.0/8 md5

# Watchdog configuration for fencing
# Prevents split-brain by ensuring failed leader is truly down
watchdog:
  mode: required
  device: /dev/watchdog
  safety_margin: 5

# Tags for this node
tags:
  # Set to false if this node should never become primary
  nofailover: false

  # Set to true if this node should not receive client connections
  noloadbalance: false

  # Clone from this node preference (lower = preferred)
  clonefrom: true
```

### Database Failover Script

Here is a script to manage PostgreSQL failover with Patroni:

```python
# db_failover.py
# Manages database failover operations using Patroni REST API

import requests
import time
import logging
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PatroniFailoverManager:
    """
    Manages failover operations for a Patroni PostgreSQL cluster.

    Provides methods for checking cluster health, initiating failover,
    and monitoring failover progress.
    """

    def __init__(
        self,
        patroni_nodes: list,
        api_username: str,
        api_password: str
    ):
        """
        Initialize the failover manager.

        Args:
            patroni_nodes: List of Patroni node addresses (host:port)
            api_username: Username for Patroni REST API
            api_password: Password for Patroni REST API
        """
        self.nodes = patroni_nodes
        self.auth = (api_username, api_password)
        self.timeout = 10

    def get_cluster_status(self) -> Optional[Dict[str, Any]]:
        """
        Retrieve the current cluster status from Patroni.

        Returns:
            Dictionary containing cluster state or None if unavailable
        """
        for node in self.nodes:
            try:
                response = requests.get(
                    f"http://{node}/cluster",
                    auth=self.auth,
                    timeout=self.timeout
                )

                if response.status_code == 200:
                    return response.json()

            except requests.RequestException as e:
                logger.warning(f"Failed to reach {node}: {e}")
                continue

        logger.error("Unable to reach any Patroni nodes")
        return None

    def get_current_leader(self) -> Optional[str]:
        """
        Get the current cluster leader name.

        Returns:
            Name of the current leader or None if no leader
        """
        status = self.get_cluster_status()

        if status is None:
            return None

        for member in status.get('members', []):
            if member.get('role') == 'leader':
                return member.get('name')

        return None

    def get_healthy_replicas(self) -> list:
        """
        Get list of healthy replica nodes suitable for promotion.

        Returns:
            List of replica names that are streaming and caught up
        """
        status = self.get_cluster_status()

        if status is None:
            return []

        healthy_replicas = []

        for member in status.get('members', []):
            # Check if this is a replica
            if member.get('role') != 'replica':
                continue

            # Check if replica is healthy
            # State should be 'streaming' for synchronous replication
            if member.get('state') == 'streaming':
                # Check replication lag
                lag = member.get('lag', float('inf'))

                # Only consider replicas with acceptable lag
                # (less than 1MB or 0 for synchronous)
                if lag < 1048576:
                    healthy_replicas.append({
                        'name': member.get('name'),
                        'lag': lag,
                        'timeline': member.get('timeline')
                    })

        # Sort by lag (prefer replicas with lowest lag)
        healthy_replicas.sort(key=lambda x: x['lag'])

        return healthy_replicas

    def initiate_failover(
        self,
        target_node: Optional[str] = None
    ) -> bool:
        """
        Initiate a planned failover to a specific node or best replica.

        Args:
            target_node: Specific node to promote (optional)

        Returns:
            True if failover was initiated successfully
        """
        current_leader = self.get_current_leader()

        if current_leader is None:
            logger.error("No current leader found, cannot initiate failover")
            return False

        # If no target specified, let Patroni choose
        if target_node is None:
            healthy = self.get_healthy_replicas()
            if not healthy:
                logger.error("No healthy replicas available for failover")
                return False
            target_node = healthy[0]['name']

        logger.info(
            f"Initiating failover from {current_leader} to {target_node}"
        )

        # Send failover request to any available node
        for node in self.nodes:
            try:
                response = requests.post(
                    f"http://{node}/failover",
                    auth=self.auth,
                    json={
                        'leader': current_leader,
                        'candidate': target_node
                    },
                    timeout=self.timeout
                )

                if response.status_code == 200:
                    logger.info("Failover initiated successfully")
                    return True
                else:
                    logger.warning(
                        f"Failover request returned {response.status_code}: "
                        f"{response.text}"
                    )

            except requests.RequestException as e:
                logger.warning(f"Failed to reach {node}: {e}")
                continue

        logger.error("Failed to initiate failover")
        return False

    def wait_for_failover_completion(
        self,
        expected_leader: str,
        timeout_seconds: int = 60
    ) -> bool:
        """
        Wait for failover to complete and verify new leader.

        Args:
            expected_leader: The node name that should become leader
            timeout_seconds: Maximum time to wait for failover

        Returns:
            True if failover completed successfully
        """
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            current_leader = self.get_current_leader()

            if current_leader == expected_leader:
                logger.info(
                    f"Failover complete. New leader: {current_leader}"
                )
                return True

            logger.info(
                f"Waiting for failover... Current leader: {current_leader}"
            )
            time.sleep(2)

        logger.error(
            f"Failover did not complete within {timeout_seconds} seconds"
        )
        return False

    def perform_health_check(self) -> Dict[str, Any]:
        """
        Perform a comprehensive cluster health check.

        Returns:
            Dictionary containing health status details
        """
        status = self.get_cluster_status()

        if status is None:
            return {
                'healthy': False,
                'error': 'Unable to reach cluster'
            }

        health = {
            'healthy': True,
            'leader': None,
            'replicas': [],
            'issues': []
        }

        leader_found = False

        for member in status.get('members', []):
            name = member.get('name')
            role = member.get('role')
            state = member.get('state')

            if role == 'leader':
                leader_found = True
                health['leader'] = {
                    'name': name,
                    'state': state
                }

                if state != 'running':
                    health['healthy'] = False
                    health['issues'].append(
                        f"Leader {name} is not running: {state}"
                    )

            elif role == 'replica':
                replica_info = {
                    'name': name,
                    'state': state,
                    'lag': member.get('lag', 'unknown')
                }
                health['replicas'].append(replica_info)

                if state != 'streaming':
                    health['issues'].append(
                        f"Replica {name} is not streaming: {state}"
                    )

        if not leader_found:
            health['healthy'] = False
            health['issues'].append("No leader found in cluster")

        if len(health['replicas']) == 0:
            health['issues'].append("No replicas available")

        return health


# Example usage
if __name__ == "__main__":
    manager = PatroniFailoverManager(
        patroni_nodes=[
            "postgres-node-1.internal:8008",
            "postgres-node-2.internal:8008",
            "postgres-node-3.internal:8008"
        ],
        api_username="patroni",
        api_password="secure-password"
    )

    # Check cluster health
    health = manager.perform_health_check()
    print(f"Cluster healthy: {health['healthy']}")

    # Get current leader
    leader = manager.get_current_leader()
    print(f"Current leader: {leader}")

    # List healthy replicas
    replicas = manager.get_healthy_replicas()
    print(f"Healthy replicas: {replicas}")
```

## Application-Level Failover

Beyond infrastructure, applications need to handle failover gracefully. Here is a pattern for implementing connection failover in application code:

```python
# connection_manager.py
# Application-level database connection manager with failover support

import psycopg2
from psycopg2 import pool
import time
import logging
from typing import Optional, Any
from contextlib import contextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FailoverConnectionPool:
    """
    A database connection pool with automatic failover capability.

    Manages connections to primary and replica databases, automatically
    retrying failed operations and switching to healthy nodes.
    """

    def __init__(
        self,
        primary_dsn: str,
        replica_dsns: list,
        min_connections: int = 2,
        max_connections: int = 10,
        retry_attempts: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize the connection pool with failover configuration.

        Args:
            primary_dsn: Connection string for primary database
            replica_dsns: List of connection strings for replicas
            min_connections: Minimum connections to maintain
            max_connections: Maximum connections allowed
            retry_attempts: Number of retry attempts on failure
            retry_delay: Delay between retries in seconds
        """
        self.primary_dsn = primary_dsn
        self.replica_dsns = replica_dsns
        self.min_conn = min_connections
        self.max_conn = max_connections
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay

        # Connection pools
        self._primary_pool: Optional[pool.ThreadedConnectionPool] = None
        self._replica_pools: list = []
        self._current_replica_index = 0

        # Initialize pools
        self._initialize_pools()

    def _initialize_pools(self) -> None:
        """Initialize connection pools for primary and replicas."""
        # Initialize primary pool
        try:
            self._primary_pool = pool.ThreadedConnectionPool(
                self.min_conn,
                self.max_conn,
                self.primary_dsn
            )
            logger.info("Primary connection pool initialized")
        except psycopg2.Error as e:
            logger.error(f"Failed to initialize primary pool: {e}")
            self._primary_pool = None

        # Initialize replica pools
        for dsn in self.replica_dsns:
            try:
                replica_pool = pool.ThreadedConnectionPool(
                    self.min_conn,
                    self.max_conn,
                    dsn
                )
                self._replica_pools.append(replica_pool)
                logger.info(f"Replica pool initialized: {dsn.split('@')[1]}")
            except psycopg2.Error as e:
                logger.warning(f"Failed to initialize replica pool: {e}")

    def _get_next_replica_pool(self) -> Optional[pool.ThreadedConnectionPool]:
        """
        Get the next available replica pool using round-robin.

        Returns:
            Connection pool or None if no replicas available
        """
        if not self._replica_pools:
            return None

        # Round-robin through replicas
        attempts = len(self._replica_pools)

        for _ in range(attempts):
            pool_instance = self._replica_pools[self._current_replica_index]
            self._current_replica_index = (
                (self._current_replica_index + 1) % len(self._replica_pools)
            )

            # Test if pool is healthy
            try:
                conn = pool_instance.getconn()
                pool_instance.putconn(conn)
                return pool_instance
            except psycopg2.Error:
                continue

        return None

    @contextmanager
    def get_connection(self, read_only: bool = False):
        """
        Get a database connection with automatic failover.

        Args:
            read_only: If True, prefer replica connections

        Yields:
            Database connection
        """
        connection = None
        pool_instance = None

        try:
            if read_only and self._replica_pools:
                # Try to get a replica connection for read operations
                pool_instance = self._get_next_replica_pool()

                if pool_instance:
                    connection = pool_instance.getconn()
                    logger.debug("Using replica connection for read")

            # Fall back to primary if no replica available
            if connection is None and self._primary_pool:
                pool_instance = self._primary_pool
                connection = pool_instance.getconn()
                logger.debug("Using primary connection")

            if connection is None:
                raise Exception("No database connections available")

            yield connection

        finally:
            if connection and pool_instance:
                pool_instance.putconn(connection)

    def execute_with_retry(
        self,
        query: str,
        params: tuple = None,
        read_only: bool = False
    ) -> Any:
        """
        Execute a query with automatic retry on failure.

        Args:
            query: SQL query to execute
            params: Query parameters
            read_only: Whether this is a read-only query

        Returns:
            Query results for SELECT, row count for others
        """
        last_error = None

        for attempt in range(self.retry_attempts):
            try:
                with self.get_connection(read_only=read_only) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute(query, params)

                        # Check if this is a SELECT query
                        if cursor.description:
                            return cursor.fetchall()
                        else:
                            conn.commit()
                            return cursor.rowcount

            except psycopg2.OperationalError as e:
                last_error = e
                logger.warning(
                    f"Query failed (attempt {attempt + 1}/"
                    f"{self.retry_attempts}): {e}"
                )

                # Wait before retry
                if attempt < self.retry_attempts - 1:
                    time.sleep(self.retry_delay * (attempt + 1))

                    # Try to reinitialize pools on connection errors
                    self._initialize_pools()

        # All retries failed
        logger.error(f"Query failed after {self.retry_attempts} attempts")
        raise last_error

    def close(self) -> None:
        """Close all connection pools."""
        if self._primary_pool:
            self._primary_pool.closeall()

        for replica_pool in self._replica_pools:
            replica_pool.closeall()

        logger.info("All connection pools closed")


# Example usage
if __name__ == "__main__":
    # Initialize the failover-aware connection pool
    db = FailoverConnectionPool(
        primary_dsn="postgresql://app:password@primary.db.internal:5432/myapp",
        replica_dsns=[
            "postgresql://app:password@replica1.db.internal:5432/myapp",
            "postgresql://app:password@replica2.db.internal:5432/myapp"
        ],
        min_connections=2,
        max_connections=10,
        retry_attempts=3,
        retry_delay=1.0
    )

    # Execute a read query (will use replica if available)
    results = db.execute_with_retry(
        "SELECT * FROM users WHERE active = %s",
        params=(True,),
        read_only=True
    )

    # Execute a write query (will use primary)
    db.execute_with_retry(
        "UPDATE users SET last_login = NOW() WHERE id = %s",
        params=(123,),
        read_only=False
    )

    # Clean up
    db.close()
```

## Failover Runbook Templates

Runbooks are essential for ensuring consistent and reliable failover execution. Here are templates for common failover scenarios.

### DNS Failover Runbook

```markdown
# DNS Failover Runbook

## Overview
This runbook describes the procedure for executing DNS failover when the
primary region becomes unavailable.

## Prerequisites
- [ ] AWS CLI configured with appropriate permissions
- [ ] Access to Route 53 console as backup
- [ ] List of DNS records to update

## Trigger Conditions
Execute this runbook when:
1. Primary region health checks fail for > 5 minutes
2. Multiple services in primary region are unavailable
3. Directed by incident commander

## Procedure

### Step 1: Verify Outage (2 minutes)
```bash
# Check health check status
aws route53 get-health-check-status \
    --health-check-id HC_PRIMARY_ID

# Verify from multiple locations
curl -I https://api.example.com/health
curl -I --resolve api.example.com:443:SECONDARY_IP https://api.example.com/health
```

### Step 2: Confirm Secondary Region Ready (3 minutes)
```bash
# Verify secondary region services
curl -I https://secondary-region.internal/health

# Check database replication lag
psql -h secondary-db.internal -c "SELECT pg_last_wal_replay_lsn();"
```

### Step 3: Execute Failover (2 minutes)
```bash
# Update DNS records
aws route53 change-resource-record-sets \
    --hosted-zone-id ZONE_ID \
    --change-batch file://failover-changes.json

# Verify change propagation
aws route53 get-change --id CHANGE_ID
```

### Step 4: Verify Failover Success (5 minutes)
```bash
# Test DNS resolution
dig +short api.example.com

# Verify application functionality
curl https://api.example.com/health

# Monitor error rates
# Check monitoring dashboard for error spikes
```

## Rollback Procedure
If failover causes issues, execute the rollback:

```bash
# Revert DNS changes
aws route53 change-resource-record-sets \
    --hosted-zone-id ZONE_ID \
    --change-batch file://rollback-changes.json
```

## Post-Failover Actions
1. [ ] Update status page
2. [ ] Notify stakeholders
3. [ ] Create incident ticket
4. [ ] Schedule post-mortem

## Contacts
- Primary On-Call: Check PagerDuty
- Database Team: #db-oncall
- Platform Team: #platform-oncall
```

### Database Failover Runbook

```markdown
# Database Failover Runbook

## Overview
Procedure for promoting a PostgreSQL replica to primary using Patroni.

## Prerequisites
- [ ] SSH access to database nodes
- [ ] Patroni API credentials
- [ ] psql client installed

## Trigger Conditions
Execute this runbook when:
1. Primary database is unresponsive
2. Primary node has hardware failure
3. Primary region is unavailable

## Pre-Failover Checks

### Step 1: Assess Cluster State (2 minutes)
```bash
# Check Patroni cluster status
curl -s http://patroni-node:8008/cluster | jq .

# Verify replication lag on replicas
psql -h replica1.internal -c "
    SELECT
        pg_is_in_recovery(),
        pg_last_wal_receive_lsn(),
        pg_last_wal_replay_lsn(),
        pg_last_xact_replay_timestamp();
"
```

### Step 2: Identify Promotion Target (1 minute)
```bash
# List available replicas with lag
curl -s http://patroni-node:8008/cluster | \
    jq '.members[] | select(.role=="replica") | {name, lag, state}'
```

## Automatic Failover
If Patroni automatic failover is enabled, monitor the promotion:

```bash
# Watch for leader change
watch -n 2 'curl -s http://patroni-node:8008/cluster | jq .'
```

## Manual Failover

### Step 3: Initiate Failover (1 minute)
```bash
# Trigger planned failover
curl -s -X POST http://patroni-node:8008/failover \
    -H "Content-Type: application/json" \
    -d '{"leader": "current-leader", "candidate": "target-replica"}'
```

### Step 4: Verify Promotion (3 minutes)
```bash
# Confirm new leader
curl -s http://patroni-node:8008/cluster | jq '.members[] | select(.role=="leader")'

# Verify new leader is accepting writes
psql -h new-leader.internal -c "SELECT pg_is_in_recovery();"
# Should return 'f' (false) for primary

# Test write operation
psql -h new-leader.internal -c "
    CREATE TABLE failover_test (id serial, ts timestamp default now());
    INSERT INTO failover_test DEFAULT VALUES;
    SELECT * FROM failover_test;
    DROP TABLE failover_test;
"
```

## Application Reconnection

### Step 5: Verify Application Connectivity (5 minutes)
```bash
# Check application database connections
kubectl exec -it app-pod -- psql $DATABASE_URL -c "SELECT 1;"

# Monitor connection pool stats
curl -s http://app-service/metrics | grep db_connection
```

## Rollback Procedure
Rollback requires careful coordination to avoid data loss.

**WARNING: Only perform if absolutely necessary and data conflicts are acceptable.**

```bash
# Demote current leader (if still accessible)
curl -s -X POST http://current-leader:8008/failover \
    -d '{"leader": "new-leader", "candidate": "original-leader"}'
```

## Post-Failover Actions
1. [ ] Verify all applications reconnected
2. [ ] Check replication status of remaining replicas
3. [ ] Investigate original primary failure
4. [ ] Plan to reintroduce old primary as replica
5. [ ] Update documentation if needed
6. [ ] Create incident report

## Recovery: Reintroduce Old Primary as Replica
After resolving the original issue:

```bash
# On the old primary node
# Patroni will automatically attempt to rejoin using pg_rewind
systemctl restart patroni

# Monitor rejoin progress
journalctl -u patroni -f
```
```

## Failover Testing Strategy

Regular testing is essential to ensure your failover procedures work when needed. Here is a testing framework:

```mermaid
flowchart LR
    subgraph Quarterly
        A[Full DR Test]
    end

    subgraph Monthly
        B[Database Failover Test]
        C[DNS Failover Test]
    end

    subgraph Weekly
        D[Health Check Validation]
        E[Runbook Review]
    end

    subgraph Continuous
        F[Chaos Engineering]
        G[Synthetic Monitoring]
    end

    A --> B
    B --> D
    C --> D
    D --> F
    E --> F
```

### Automated Failover Test Script

```python
# failover_test.py
# Automated failover testing framework

import time
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Callable
from dataclasses import dataclass, field
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestResult(Enum):
    """Possible outcomes for a failover test."""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class FailoverTestCase:
    """Represents a single failover test case."""
    name: str
    description: str
    setup: Callable
    execute: Callable
    verify: Callable
    cleanup: Callable
    timeout_seconds: int = 300

    # Results populated after execution
    result: TestResult = field(default=TestResult.SKIPPED)
    duration_seconds: float = 0
    error_message: str = ""


class FailoverTestRunner:
    """
    Runs failover tests and generates reports.

    This framework allows you to define and execute failover tests
    in a controlled manner with proper setup, execution, verification,
    and cleanup phases.
    """

    def __init__(self, environment: str):
        """
        Initialize the test runner.

        Args:
            environment: Target environment (staging, production-canary, etc.)
        """
        self.environment = environment
        self.test_cases: List[FailoverTestCase] = []
        self.results: List[Dict[str, Any]] = []

    def add_test(self, test_case: FailoverTestCase) -> None:
        """Add a test case to the runner."""
        self.test_cases.append(test_case)
        logger.info(f"Added test: {test_case.name}")

    def run_test(self, test_case: FailoverTestCase) -> Dict[str, Any]:
        """
        Run a single failover test case.

        Args:
            test_case: The test case to execute

        Returns:
            Dictionary containing test results
        """
        logger.info(f"Running test: {test_case.name}")
        start_time = time.time()

        result = {
            'name': test_case.name,
            'description': test_case.description,
            'environment': self.environment,
            'timestamp': datetime.utcnow().isoformat(),
            'result': TestResult.SKIPPED.value,
            'duration_seconds': 0,
            'error': None,
            'phases': {}
        }

        try:
            # Setup phase
            logger.info(f"  Setup phase...")
            phase_start = time.time()
            test_case.setup()
            result['phases']['setup'] = {
                'status': 'completed',
                'duration': time.time() - phase_start
            }

            # Execute phase
            logger.info(f"  Execute phase...")
            phase_start = time.time()
            test_case.execute()
            result['phases']['execute'] = {
                'status': 'completed',
                'duration': time.time() - phase_start
            }

            # Verify phase
            logger.info(f"  Verify phase...")
            phase_start = time.time()
            verification_passed = test_case.verify()
            result['phases']['verify'] = {
                'status': 'completed' if verification_passed else 'failed',
                'duration': time.time() - phase_start
            }

            if verification_passed:
                result['result'] = TestResult.PASSED.value
                logger.info(f"  Test PASSED")
            else:
                result['result'] = TestResult.FAILED.value
                result['error'] = "Verification failed"
                logger.error(f"  Test FAILED: Verification failed")

        except Exception as e:
            result['result'] = TestResult.FAILED.value
            result['error'] = str(e)
            logger.error(f"  Test FAILED: {e}")

        finally:
            # Cleanup phase (always runs)
            logger.info(f"  Cleanup phase...")
            try:
                phase_start = time.time()
                test_case.cleanup()
                result['phases']['cleanup'] = {
                    'status': 'completed',
                    'duration': time.time() - phase_start
                }
            except Exception as e:
                result['phases']['cleanup'] = {
                    'status': 'failed',
                    'error': str(e)
                }
                logger.error(f"  Cleanup failed: {e}")

        result['duration_seconds'] = time.time() - start_time
        return result

    def run_all_tests(self) -> Dict[str, Any]:
        """
        Run all registered test cases.

        Returns:
            Summary of all test results
        """
        logger.info(f"Starting failover test suite for {self.environment}")
        suite_start = time.time()

        self.results = []

        for test_case in self.test_cases:
            result = self.run_test(test_case)
            self.results.append(result)

        # Generate summary
        summary = {
            'environment': self.environment,
            'timestamp': datetime.utcnow().isoformat(),
            'total_duration_seconds': time.time() - suite_start,
            'total_tests': len(self.results),
            'passed': sum(
                1 for r in self.results
                if r['result'] == TestResult.PASSED.value
            ),
            'failed': sum(
                1 for r in self.results
                if r['result'] == TestResult.FAILED.value
            ),
            'skipped': sum(
                1 for r in self.results
                if r['result'] == TestResult.SKIPPED.value
            ),
            'tests': self.results
        }

        logger.info(
            f"Test suite complete: "
            f"{summary['passed']} passed, "
            f"{summary['failed']} failed, "
            f"{summary['skipped']} skipped"
        )

        return summary

    def generate_report(self, output_path: str) -> None:
        """
        Generate a JSON report of test results.

        Args:
            output_path: Path to write the report
        """
        summary = self.run_all_tests()

        with open(output_path, 'w') as f:
            json.dump(summary, f, indent=2)

        logger.info(f"Report written to {output_path}")


# Example test definitions
def create_dns_failover_test() -> FailoverTestCase:
    """Create a DNS failover test case."""

    def setup():
        # Verify initial state
        # Check that primary is healthy
        # Check that secondary is ready
        logger.info("    Verifying initial cluster state")
        time.sleep(1)  # Simulated check

    def execute():
        # Simulate primary failure
        # This could block health check endpoint temporarily
        logger.info("    Simulating primary failure")
        time.sleep(2)  # Simulated failover time

    def verify():
        # Check that DNS now points to secondary
        # Verify service is accessible
        logger.info("    Verifying DNS failover occurred")
        time.sleep(1)
        return True  # Return actual verification result

    def cleanup():
        # Restore primary
        # Reset DNS to normal state
        logger.info("    Restoring primary and DNS")
        time.sleep(1)

    return FailoverTestCase(
        name="DNS Failover Test",
        description="Verify DNS automatically fails over when primary is unhealthy",
        setup=setup,
        execute=execute,
        verify=verify,
        cleanup=cleanup,
        timeout_seconds=120
    )


def create_database_failover_test() -> FailoverTestCase:
    """Create a database failover test case."""

    def setup():
        logger.info("    Verifying database cluster health")
        logger.info("    Recording current leader and replication state")
        time.sleep(1)

    def execute():
        logger.info("    Initiating controlled database failover")
        # In real implementation, call Patroni API
        time.sleep(5)  # Simulated failover time

    def verify():
        logger.info("    Verifying new leader is operational")
        logger.info("    Checking application connectivity")
        logger.info("    Verifying no data loss")
        time.sleep(2)
        return True

    def cleanup():
        logger.info("    Optionally failing back to original primary")
        logger.info("    Verifying cluster fully synchronized")
        time.sleep(2)

    return FailoverTestCase(
        name="Database Failover Test",
        description="Verify PostgreSQL cluster automatically promotes replica on leader failure",
        setup=setup,
        execute=execute,
        verify=verify,
        cleanup=cleanup,
        timeout_seconds=300
    )


# Run tests
if __name__ == "__main__":
    runner = FailoverTestRunner(environment="staging")

    # Add test cases
    runner.add_test(create_dns_failover_test())
    runner.add_test(create_database_failover_test())

    # Run and generate report
    runner.generate_report("/tmp/failover-test-report.json")
```

## Monitoring and Alerting for Failover Events

Proper monitoring ensures you know when failovers occur and can track their success:

```yaml
# prometheus-rules.yaml
# Alerting rules for failover events

groups:
  - name: failover-alerts
    rules:
      # Alert when DNS failover occurs
      - alert: DNSFailoverTriggered
        expr: |
          changes(dns_failover_active{service="api"}[5m]) > 0
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "DNS failover triggered for {{ $labels.service }}"
          description: |
            DNS failover was triggered for service {{ $labels.service }}.
            Current target: {{ $labels.target_region }}

      # Alert when database failover occurs
      - alert: DatabaseFailoverOccurred
        expr: |
          changes(pg_replication_is_replica{job="postgresql"}[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Database failover detected"
          description: |
            A database failover event was detected in cluster {{ $labels.cluster }}.
            New primary: {{ $labels.instance }}

      # Alert if failover takes too long
      - alert: FailoverDurationHigh
        expr: |
          failover_duration_seconds > 60
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Failover took longer than expected"
          description: |
            Failover for {{ $labels.service }} took {{ $value }} seconds.
            Expected: < 60 seconds

      # Alert if no healthy failover targets
      - alert: NoHealthyFailoverTargets
        expr: |
          sum(healthy_failover_targets) by (service) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No healthy failover targets for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} has no healthy failover targets.
            Immediate action required to restore redundancy.
```

## Summary

Implementing effective failover procedures requires careful planning across multiple layers:

1. **DNS Failover**: Use health checks and low TTLs to enable rapid traffic redirection
2. **Database Failover**: Leverage tools like Patroni for automatic PostgreSQL failover with proper consensus
3. **Application-Level Failover**: Implement connection pooling with retry logic and replica awareness
4. **Runbooks**: Document procedures clearly so anyone can execute them under pressure
5. **Testing**: Regularly test failover procedures to ensure they work when needed
6. **Monitoring**: Set up alerts to track failover events and their success

Remember that failover is not a replacement for fixing root causes. After any failover event, prioritize investigating and resolving the underlying issue, then plan to restore full redundancy.

The key to successful failover is preparation. By implementing these patterns and regularly testing your procedures, you can ensure your systems remain available even when individual components fail.
