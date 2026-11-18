# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Pixelian, email [hello@antranik.dev](mailto:hello@antranik.dev) with the subject "Pixelian Security".

Please include:

- A description of the issue and its potential impact.
- Steps to reproduce it, including a proof of concept if available.
- The affected Pixelian version (see `CORE_VERSION` in `js/core/config.js` or the page's `generator` meta tag).
- Any suggested mitigation or fix.

Do not open a public GitHub issue or disclose the vulnerability publicly before it has been reviewed.

## Supported Versions

Security fixes are provided for the latest supported minor release.

| Version | Supported |
| ------- | --------- |
| `2.x`   | Yes       |
| `1.x`   | No        |

## Scope

Security issues in Pixelian's shipped template are in scope, including:

- Core code in `js/core/`.
- The PHP entry point (`index.php`).
- The reference nginx configuration (`nginx.example.conf`).
- The setup script (`setup.sh`).

The following are outside the scope of this policy:

- Vulnerabilities introduced by applications built with Pixelian.
- Custom modules or backend services added by a project.
- Social engineering.
- Denial of service caused solely by resource exhaustion.

## Response

Reports are acknowledged within 7 days. Confirmed issues are addressed in patch releases when a fix is available and documented in [CHANGELOG](CHANGELOG.md).

Reporters are credited unless they request anonymity.
