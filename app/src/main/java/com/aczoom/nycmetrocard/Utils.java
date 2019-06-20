package com.aczoom.nycmetrocard;

import android.annotation.TargetApi;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager.NameNotFoundException;
import android.util.Log;
import android.view.View;
import android.webkit.WebView;
import android.widget.ZoomButtonsController;

/**
 * Shared utility functions used by multiple activities.
 *
 * @author avinash
 *
 */
public enum Utils {
    UTILITY_FUNCTIONS_CLASS;

    // For logging and debugging purposes
    private static final String TAG = "Utils";

    // Get the app package info with version name, version code, etc.
    public static PackageInfo getAppPackageInfo(Context context)
    {
        PackageInfo pInfo = null;
        try
        {
            pInfo = context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0);
        } catch (NameNotFoundException e)
        {
            Log.d(TAG, "Failed to get PackageInfo " + e);
            pInfo = new PackageInfo(); // to denote null version
        }
        return pInfo;
    }

    // Get app version string
    public static String getAppVersion(Context context)
    {
        PackageInfo pInfo = Utils.getAppPackageInfo(context);
        return pInfo != null ? pInfo.versionName : "0.0.0";
    }


    /**
     * Turn on Zoom (pinch-to-zoom), but disable on-screen zoom buttons for WebView.
     * http://stackoverflow.com/questions/5125851/enable-disable-zoom-in-android-webview/14751673#14751673
     *
     * App runs on API 10 or lower which has no easy way to disable the
     *  displayed on-screen + - zoom controls.
     * mWebView.getSettings().setBuiltInZoomControls(false); // this is fine
     * mWebView.getSettings().setDisplayZoomControls(false); // API 11 only
     * So the code below is a workaround that seems to work fine on 2.3.3 tablets.
     */
    @TargetApi(11)
    public static void EnableZoomWithoutControls(final WebView webview) {
        webview.getSettings().setSupportZoom(true);
        webview.getSettings().setBuiltInZoomControls(true);
        webview.getSettings().setUseWideViewPort(true);
        // WideViewPort essentially zooms page and uses horizontal scroll bars.
        // WideViewPort necessary to avoid garbling table header row and all columns on
        // Android 2.3.7 versions. Not necessary on newer Android.
        // Provides for much better interaction, similar to normal web browser zooming.

        // Use the API 11+ calls to disable the controls.
        // Use a separate class to obtain 1.6 compatibility (avoid crashes on older systems).
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.HONEYCOMB) {
            new Runnable() {
                public void run() {
                    webview.getSettings().setDisplayZoomControls(false);
                }
            }.run();
        } else {
            try {
                ZoomButtonsController zoom_control;
                zoom_control = ((ZoomButtonsController) webview.getClass().getMethod("getZoomButtonsController").invoke(webview, (Object[]) null));
                zoom_control.getContainer().setVisibility(View.GONE);
            }
            catch (Exception e) {
                Log.d(TAG, "Failed to use ZoomButtonsController " + e);
                // e.printStackTrace();
            }
        }
    }


}
