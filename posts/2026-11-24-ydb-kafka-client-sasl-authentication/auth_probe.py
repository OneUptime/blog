from pathlib import Path


def make_config(endpoint, username, database, ca_file, password):
    if not endpoint or not username or not password:
        raise ValueError("Endpoint, username and password are required")
    if not database.startswith("/"):
        raise ValueError("Database must be an absolute YDB path")
    if not Path(ca_file).is_file():
        raise ValueError("CA file must exist")
    return {
        "bootstrap.servers": endpoint,
        "security.protocol": "SASL_SSL",
        "sasl.mechanism": "PLAIN",
        "sasl.username": f"{username}@{database}",
        "sasl.password": password,
        "ssl.ca.location": ca_file,
        "enable.ssl.certificate.verification": True,
        "ssl.endpoint.identification.algorithm": "https",
    }


def main():
    import getpass
    import os
    from confluent_kafka.admin import AdminClient

    config = make_config(
        os.environ["YDB_KAFKA_ENDPOINT"],
        os.environ["YDB_USER"],
        os.environ["YDB_DATABASE"],
        os.environ["YDB_KAFKA_CA"],
        getpass.getpass("YDB password: "),
    )
    metadata = AdminClient(config).list_topics(timeout=10)
    print(f"Metadata received from {len(metadata.brokers)} broker(s)")


if __name__ == "__main__":
    main()
