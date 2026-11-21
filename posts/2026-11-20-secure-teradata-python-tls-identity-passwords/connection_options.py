def connection_options(mode, host, ca_file, user=None):
    options = {
        'host': host,
        'sslmode': 'VERIFY-FULL',
        'sslca': ca_file,
        'connect_timeout': '5000',
        'logon_timeout': '180',
        'request_timeout': '60',
    }
    if mode == 'browser':
        options.update(logmech='BROWSER', oidc_sslmode='VERIFY-FULL')
    elif mode == 'kerberos':
        options.update(logmech='KRB5')
    elif mode == 'stored':
        if not user:
            raise ValueError('Stored-password mode requires a database user')
        options.update(
            logmech='TD2',
            user=user,
            password=(
                'ENCRYPTED_PASSWORD('
                'file:/run/secrets/td-key.properties,'
                'file:/run/secrets/td-password.properties)'
            ),
        )
    else:
        raise ValueError('Choose browser, kerberos or stored')
    return options
