package com.aczoom.nycmetrocard;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** HTML5 web page wrapped as an Android App.
 *
 * Open Source: https://code.google.com/p/nyc-metrocard-refill/
 */

@SuppressLint("SetJavaScriptEnabled")
public class MainActivity extends Activity
{
   // For logging and debugging purposes
   private static final String TAG = "MainActivity";

   // Custom User Agent - this is the suffix with version number
   private static final String USER_AGENT = "NYCMetroCard";

   private static final String ROOT_URL = "file:///android_asset/www/";
   private static final String INDEX_URL = ROOT_URL + "index.html";
   private static final String HELP_URL = ROOT_URL + "page.html";

   private WebView mWebView = null;

   @Override
   protected void onCreate(Bundle savedInstanceState)
   {
      super.onCreate(savedInstanceState);
      setContentView(R.layout.activity_main);

      mWebView = (WebView)findViewById(R.id.webview);

      // Web pages used in this app use JavaScript.
      mWebView.getSettings().setJavaScriptEnabled(true);

      // HTML5 localStorage used to save form state.
      // This uses internal storage, so requires no special Android permissions.
      mWebView.getSettings().setDomStorageEnabled(true);

      // Allow pinch-to-zoom, but don't show the on-screen zoom controls.
      Utils.EnableZoomWithoutControls(mWebView);

      // Override URLs clicked on the pages to handle internal vs external links.
      mWebView.setWebChromeClient(new WebChromeClient());
      mWebView.setWebViewClient(new MyWebViewClient());

      // Use a custom User Agent string, so JavaScript in the pages can detect
      // if running under this app, or on a web browser.
      String ua = mWebView.getSettings().getUserAgentString();
      String version = Utils.getAppVersion(this);
      String customUA = ua + " " + USER_AGENT + "/" + version;
      mWebView.getSettings().setUserAgentString(customUA);
      Log.d(TAG, "Using UA: " + customUA);

      // If this is a screen orientation change, etc, don't load any URLs
      // otherwise, load the start page.
      if (savedInstanceState == null) {
         mWebView.loadUrl(INDEX_URL);
      }
   }

   /*
    * When Android Back Button is pressed, see if we need to go back in
   // our app's internal pages, or to exit the app, etc.
    * (non-Javadoc)
    * @see android.app.Activity#onBackPressed()
    */
   @Override
   public void onBackPressed() {
      // Check if there's history
      WebView mWebView = (WebView)findViewById(R.id.webview);
      if (mWebView.canGoBack()) {
         mWebView.goBack();
         return;
      }
      // If there's no web page history, bubble up to the default
      // system behavior (probably exit the activity)
      super.onBackPressed();
   }

   /*
    * Handle orientation change, save webview state (saves the url and page history)
    * Necessary to allow help.html page to remain on screen on orientation change.
    */
   @Override
   protected void onSaveInstanceState(Bundle outState) {
      super.onSaveInstanceState(outState);
      mWebView.saveState(outState);
   }

   @Override
   protected void onRestoreInstanceState(Bundle savedInstanceState)
   {
     super.onRestoreInstanceState(savedInstanceState);
     mWebView.restoreState(savedInstanceState);
   }

   /* Options Menu
    * This may not be used - the manifest may set theme to use
    * full screen without the action bar, since that dislays the page better.
    * Leaving code here just in case it is needed later.
    * @see android.app.Activity#onCreateOptionsMenu(android.view.Menu)
    */
   @Override
   public boolean onCreateOptionsMenu(Menu menu) {
      // Use this later if needed:
      // MenuInflater inflater = getMenuInflater();
      // inflater.inflate(R.menu.options_menu, menu);
      // For now, using this in manifest which hides Action Bar
      //   android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
      return true;
   }

   @Override
   public boolean onOptionsItemSelected(MenuItem item) {
       // Handle item selection
       switch (item.getItemId()) {
           case R.id.help:
               showHelp();
               return true;
           default:
               return super.onOptionsItemSelected(item);
       }
   }

   /*
    * Display help page.
    */
   private void showHelp() {
      mWebView.loadUrl(HELP_URL);
   }

   /*
    * Local class to override user clicks on the app pages' HREF links
    */
   private class MyWebViewClient extends WebViewClient {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
         // Example: URL file:///android_asset/www/help.html
         //          Host: <empty>
         Uri uri = Uri.parse(url);
         String host = uri.getHost();

         if (TextUtils.isEmpty(host)) {
            // Local files, so do not override; let my WebView load the page
            return false;
         }
         // Otherwise, the link is not for a page on my site, so launch another Activity that handles URLs
         Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
         startActivity(intent);
         return true;
      }
   }
}

