package com.aczoom.nycmetrocard;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager.NameNotFoundException;
import android.util.Log;

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
   
}
