# Contact form email delivery

The form sends mail to salaimazawn@gmail.com through Brevo's HTTPS API. Create a Brevo account, verify your sender address, and set these variables privately on the Render backend service:

```
BREVO_API_KEY=<your Brevo API key>
CONTACT_FROM_EMAIL=<your verified sender email>
```

Use salaimazawn@gmail.com as sender if your account supports it; otherwise use an authenticated domain sender. The recipient remains salaimazawn@gmail.com. Never commit the API key or paste it in chat. No Gmail password is needed. Save the variables and redeploy the backend. Send a message from the website and confirm receipt in the inbox/spam folder and Brevo delivery logs. The Reply button addresses the visitor's email.

Until configured, the form reports that delivery is unavailable and provides the direct address. Provider acceptance does not guarantee inbox placement. API reference: https://developers.brevo.com/reference/send-transac-email
