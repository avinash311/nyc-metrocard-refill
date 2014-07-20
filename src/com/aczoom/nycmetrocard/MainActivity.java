package com.aczoom.nycmetrocard;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** HTML5 web page wrapped as an Android App.
 * http://developer.android.com/guide/webapps/webview.html
 */

@SuppressLint("SetJavaScriptEnabled")
public class MainActivity extends Activity
{
   
   private static final String UAAGENT = "NYCMetroCard";

   // For logging and debugging purposes
   private static final String TAG = "MainActivity";

   private WebView mWebView = null;

   @Override
   protected void onCreate(Bundle savedInstanceState)
   {
      super.onCreate(savedInstanceState);
      setContentView(R.layout.activity_main);

      mWebView = (WebView)findViewById(R.id.webview);

      mWebView.getSettings().setJavaScriptEnabled(true);

      mWebView.getSettings().setDomStorageEnabled(true);

      mWebView.setWebChromeClient(new WebChromeClient());
      mWebView.setWebViewClient(new MyWebViewClient());

      String ua = mWebView.getSettings().getUserAgentString();
      String version = Utils.getAppVersion(this);
      String customUA = ua + " " + UAAGENT + "/" + version;
      mWebView.getSettings().setUserAgentString(customUA);
      
      mWebView.loadUrl("file:///android_asset/www/index.html");
   }

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
   
   private void showHelp() {
      mWebView.loadUrl("file:///android_asset/www/help.html");      
   }

   /*
    * Local class to override web HTML link navigation
    */
   private class MyWebViewClient extends WebViewClient {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
         Log.d(TAG, "Got URL " + url);
         // Got URL file:///android_asset/www/help.html
         // Scheme: file
         // Host: <empty>
         Uri uri = Uri.parse(url);
         String host = uri.getHost();
         Log.d(TAG, "Got Scheme " + uri.getScheme());
         Log.d(TAG, "Got Host " + uri.getHost());

         if (host.equals("")) {
            // This is my web site, so do not override; let my WebView load the page
            return false;
         }
         // Otherwise, the link is not for a page on my site, so launch another Activity that handles URLs
         Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
         startActivity(intent);
         return true;
      }
   }
}

