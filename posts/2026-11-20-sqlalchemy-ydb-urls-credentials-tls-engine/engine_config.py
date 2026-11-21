from pathlib import Path
from sqlalchemy import URL, create_engine, text
from sqlalchemy.pool import QueuePool


def build_engine(host, port, database, ca_file, token_file):
    if not database.startswith('/') or database == '/':
        raise ValueError('Supply the full YDB database path beginning with /')
    token = Path(token_file).read_text().strip()
    if not token:
        raise ValueError('The token file is empty')
    root_certificates = Path(ca_file).read_bytes()
    if not root_certificates:
        raise ValueError('The CA file is empty')
    url = URL.create('yql+ydb', host=host, port=port, database=database.lstrip('/'))
    return create_engine(
        url,
        connect_args={
            'protocol': 'grpcs',
            'root_certificates': root_certificates,
            'credentials': {'token': token},
        },
        poolclass=QueuePool,
        pool_size=4,
        max_overflow=0,
        pool_timeout=5,
        echo=False,
        hide_parameters=True,
    )


def check_connection(engine):
    with engine.connect() as connection:
        value = connection.execute(text('SELECT 1 AS probe')).scalar_one()
        if value != 1:
            raise RuntimeError('Unexpected probe result')
