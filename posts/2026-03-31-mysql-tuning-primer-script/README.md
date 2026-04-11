# How to Use Tuning-Primer Script for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Tuning, Performance, Configuration, Script

Description: Download and run the MySQL Tuning Primer script to get plain-language recommendations for MySQL configuration variables based on your server's runtime statistics.

---

## What Is the Tuning-Primer Script

The Tuning-Primer script is a bash script originally developed by Matthew Montgomery. It connects to MySQL, reads `SHOW STATUS` and `SHOW VARIABLES`, and prints color-coded, plain-English recommendations for configuration variables. It covers InnoDB, MyISAM, thread cache, query cache (MySQL 5.x), connections, and memory usage. It is a lightweight alternative to MySQLTuner written entirely in bash with no Perl dependency.

## Downloading the Script

Download the original version from Launchpad:

```bash
wget https://launchpad.net/mysql-tuning-primer/trunk/1.6-r1/+download/tuning-primer.sh
chmod +x tuning-primer.sh
```

For the actively maintained fork, clone from GitHub:

```bash
git clone https://github.com/BMDan/tuning-primer.sh.git
cd tuning-primer.sh
```

## Running the Script

Run as root or a MySQL user with sufficient privileges (PROCESS privilege is needed on MySQL 8.0+):

```bash
./tuning-primer.sh
```

If prompted, enter the MySQL username, password, and socket path. The script connects via the local MySQL socket by default.

## Sample Output and What It Means

```text
-- InnoDB Metrics ------------------------------------------------
Current InnoDB index space = 2.38G
Current InnoDB data space  = 5.12G
Current InnoDB buffer pool free = 2%
innodb_buffer_pool_size is currently set to 128M

RECOMMENDATION: Set innodb_buffer_pool_size to 6G (70% of RAM)

-- Connections ------------------------------------------------
Current max_connections = 151
Current threads_connected = 142 (94% of max_connections!)

RECOMMENDATION: Increase max_connections to at least 300

-- Thread Cache ------------------------------------------------
thread_cache_size = 8
Threads_created per second = 12.5

RECOMMENDATION: Increase thread_cache_size to 32
```

## Applying Recommendations

Edit your MySQL configuration file:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size     = 6G
max_connections             = 300
thread_cache_size           = 32
table_open_cache            = 2000
```

Apply changes:

```bash
sudo systemctl restart mysql
```

For variables that support dynamic changes, you can apply them without a restart:

```sql
SET GLOBAL max_connections = 300;
SET GLOBAL thread_cache_size = 32;
```

## Checking Uptime Before Running

The script itself warns you if MySQL has been running for less than 48 hours:

```text
Warning: Server has not been running for at least 48hrs.
It may not be safe to use these recommendations
```

Wait until after at least 48 hours of representative load before acting on recommendations.

## Comparing Tuning-Primer vs MySQLTuner

```text
Feature              Tuning-Primer    MySQLTuner
Language             Bash             Perl
MySQL 8 support      Partial          Full
Output format        Terminal colors  Text sections
JSON export          No               Yes
Maintained           Community fork   Active
```

For MySQL 8.0 production environments, MySQLTuner is generally more accurate because it handles the removal of the query cache and other 8.0-specific changes. Use both tools to cross-reference recommendations.

## Summary

The Tuning-Primer script provides fast, readable MySQL configuration recommendations by analyzing runtime status variables. Run it after at least 48 hours of representative load, apply the most impactful recommendations first (InnoDB buffer pool, max connections, thread cache), then re-run to verify the improvements. Cross-reference with MySQLTuner on MySQL 8.0 systems for more complete coverage.
