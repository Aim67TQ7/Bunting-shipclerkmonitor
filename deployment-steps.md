# Deploying to Netlify from GitHub

Once you've created all the files in your GitHub repository, follow these steps to deploy to Netlify:

## Step 1: Log in to Netlify

Visit [netlify.com](https://netlify.com) and log in with your account (or create one if you don't have it).

## Step 2: Add a New Site

From your Netlify dashboard:
1. Click the "Add new site" button
2. Select "Import an existing project"
3. Choose "GitHub" as your Git provider

## Step 3: Authorize Netlify

If prompted, authorize Netlify to access your GitHub repositories.

## Step 4: Select Your Repository

From the list of repositories, select the one containing your ShipClerk Dashboard.

## Step 5: Configure Build Settings

The build settings should be automatically detected from your netlify.toml file, but verify:
- Build command: `npm run build`
- Publish directory: `build`

## Step 6: Deploy Your Site

Click "Deploy site" to begin the build and deployment process.

## Step 7: Wait for Build Completion

Netlify will start building your site. This typically takes 1-3 minutes.

## Step 8: View Your Site

Once the build is complete, you can view your site at the URL provided by Netlify (something like `random-name.netlify.app`).

## Step 9: Set Up a Custom Domain (Optional)

If you want to use a custom domain:
1. Go to "Site settings" → "Domain management"
2. Click "Add custom domain"
3. Follow the instructions to configure your domain

## Troubleshooting Common Issues

### Build Failures

If your build fails, check the build log for errors. Common issues include:
- Missing dependencies
- Syntax errors in your code
- Issues with the CSV file path

### CSV File Not Loading

Ensure your CSV file is in the correct location: `/public/data/Shipclerkmonitor.csv`

If you need to use a different path, update the fetch URL in the `fetchData` function in `App.js`:
```javascript
const response = await fetch('/your/path/to/file.csv');
```

### PDF Generation Not Working

The PDF generation relies on the html2canvas and jspdf libraries. Make sure they're properly included in your dependencies.
