# Web UI For Foobar2000

## Setup

Requires beefweb to be installed for Foobar2000

Create a file called `beefweb.config.json` in the beefweb directory (where the DLL is):

```json
{
	"responseHeaders": {
		"Access-Control-Allow-Origin": "*"
	}
}
```

## Development Notes

- You can build the schema ts file using `npm run schema`