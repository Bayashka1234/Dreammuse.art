# Vercel Speed Insights Configuration

## Current Status ✅

The `@vercel/speed-insights` package (v2.0.0) has been successfully installed and configured in this project.

**Speed Insights is now active** in `public/index.html` using the vanilla JavaScript integration method as recommended by the official Vercel documentation.

## Implementation Details

Speed Insights has been integrated into the frontend HTML file located at `public/index.html`. The implementation uses the official Vercel Speed Insights script that tracks Core Web Vitals (Largest Contentful Paint, First Input Delay, Cumulative Layout Shift) in the browser environment.

## Current Integration (Vanilla JavaScript)

The `public/index.html` file includes Speed Insights using the following code in the `<head>` section:

```html
<!-- Vercel Speed Insights -->
<script>
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```

This is the recommended approach for HTML-based applications according to the [official Vercel Speed Insights quickstart guide](https://vercel.com/docs/speed-insights/quickstart).

## Alternative Integration Methods

If you migrate to a different framework in the future, you can use these alternative methods:

### For HTML Files (Vanilla JavaScript)

Add this to your HTML `<head>` tag:

```html
<script>
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```

### For Single Page Applications (SPA)

If you add JavaScript-based routing, use:

```javascript
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights();
```

### For Next.js

If you convert this to a Next.js application with `app` directory:

```typescript
// app/layout.tsx or app/layout.js
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### For React Applications

```typescript
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  return (
    <div>
      <SpeedInsights />
      {/* Your app content */}
    </div>
  );
}
```

### For Vue Applications

```vue
<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue';
</script>

<template>
  <SpeedInsights />
  <!-- Your app content -->
</template>
```

## Verification

After adding the frontend and deploying to Vercel:

1. Deploy your application: `vercel deploy`
2. Visit your deployed site
3. Check browser DevTools Network tab for requests to `/_vercel/speed-insights/`
4. After a few days of traffic, view metrics in your Vercel dashboard under "Speed Insights"

## Additional Resources

- [Official Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights/quickstart)
- [Speed Insights API Reference](https://vercel.com/docs/speed-insights/api)
- [Core Web Vitals Guide](https://web.dev/vitals/)

## Backend Performance Monitoring

For monitoring the performance of your API endpoints (`/api/chat.js`), consider using:
- [Vercel Observability](https://vercel.com/docs/observability)
- [Vercel Tracing](https://vercel.com/docs/observability/tracing)

These tools are designed for serverless function performance monitoring.
