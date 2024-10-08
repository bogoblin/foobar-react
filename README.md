# Web UI For Foobar2000

Requires beefweb to be installed for Foobar2000

Create a file called `beefweb.config.json` in the beefweb directory (where the DLL is):

```json
{
	"responseHeaders": {
		"Access-Control-Allow-Origin": "*"
	}
}
```