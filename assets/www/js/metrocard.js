// These files are used for both the online web page as well as offline Android app

var DEBUG = 0; // > 0 for console.* messages, 0 to disable. Values 1 or 2 or 3.
// var DEBUG = 2; // COMMENT OUT FOR RELEASE

///////////////////////////////////////////////////////////////////////////
// General functions

/**
 * Display amounts are in dollars, and all internal amounts are in cents.
 * fromDisplay: given a string in dollar amounts, returns a number in cents.
 * toDisplay: given a number, returns a string in dollar amounts.
 */
function fromDisplay(displayAmount) {
  // Make sure to use round - since using floor or ceil can cause the approximate
  // float number to be wrongly converted: 2.05 -> 2.04 for example with floor!
  return Math.round(displayAmount * 100);
}

function toDisplay(amount) {
  return (amount / 100).toFixed(2);
}

// Round amount to be a integral multiple of value
function roundTo(amount, value) {
  if (amount % value != 0) {
    amount = Math.ceil(amount / value) * value;
  }
  return amount;
}

///////////////////////////////////////////////////////////////////////////

/**
 * MetroCard calculations
 * All stored amounts are in cents (US$ * 100).
 * All displayed amounts are in US$
 */
function MetroCard(balance) {
  // Constants set by New York MTA - Updated June 2015
  this.costSingle = 275; // price of a single ride
  this.bonusMin = 550; // purchase minimum to get a bonus
  this.bonusPercent = 11;

  this.purchaseMax = 8000; // max purchase amount $80.00
  this.balanceMax = 10000; // max card balance amount $100.00

  // Calculated values
  this.Update(balance, true);
}

MetroCard.prototype.Update = function (balance, vendingMachine) {
  // All purchases must be rounded to this (5 or 1)
  if (vendingMachine) {
    this.purchaseRound = 5;
  } else {
    this.purchaseRound = 1;
  }
  // Calculate values based on new balance amount
  this.balance = balance;
  if (this.balance > 0) {
    this.numRides = Math.floor(this.balance / this.costSingle);
  } else {
    this.numRides = 0;
  }
  this.bonusMinTotal = this.ComputeBonusFromPurchase(this.bonusMin) +
    this.bonusMin; // Total amount received when bonusMin amount purchased
}

// How does MTA round the bonus? No idea - assume Math.round() works the same.
// i.e., all numbers X.5 or more are rounded to the next integer X+1.
// Total = Rounded_To_Cents(Purchase * (1 + Bonus%))
// where Purchase and Total are amounts in cents.
// We have two funtions, one foward, and one inverse:
// Given Purchase, compute the bonus (this is what MTA does)
// Inverse: Given Total, compute Purchase amount (needed for this calculator)

MetroCard.prototype.ComputeBonusFromPurchase = function (purchase) {
  var bonus = 0;
  if (purchase >= this.bonusMin) {
     bonus = Math.round(purchase * this.bonusPercent / 100.0);
  }
  return bonus;
}

// Inverse: Given Total, compute the Purchase amount
// This is tricky because percent calculations require floating point
// arithmetic, so there will be inaccurate results.
// Exact inverse calculation: Purchase = Total / (1 + Bonus%)
// A couple of ways to do this: do the exact computation. That may be
// 1 cent more than needed, or 1 cent less. Check all three values, by
// doing the MTA forward calculation, and pick the best option (0 or positive
// leftover, and the lesser leftover).
// Another way: given we need Total integer cents, find the exact
// caculation for Total - 0.5. Since rounding that will give Total cents.
// Then, since that is the minimum amount necessary, in floating point,
// round that up to the next integer (Math.ceil) if not exactly an integer.

MetroCard.prototype.ComputePurchaseFromTotal = function (total) {
  var purchase = total; // default value in cents
  if (total >= this.bonusMinTotal) {
    var need = total - 0.5; // min amount required, in cents
    // Anything lower than the needed amount will not be enough, so use
    // ceil function to get next cents amount.
    purchase = Math.ceil(need * 100.0 / (100.0 + this.bonusPercent));

    // Original code, will not work - may be +1 or -1 cents than required.
    // purchase = Math.round(total * 100.0 / (100.0 + this.bonusPercent)); // NOTUSED
  }

  // Validate amount, and try next higher or lower integer as needed.
  // May not be necessay any more, but do it anyway to ensure right amount
  // and report if the above calculation failed.
  var total_new = this.ComputeBonusFromPurchase(purchase) + purchase;
  if (total_new != total) { // if diff is 0, don't need to try other amount
    var purchase_try = 0;
    if (total_new < total) {
      purchase_try = purchase + 1;
    } else if (total_new > total) {
      purchase_try = purchase - 1;
    }
    var total_try = this.ComputeBonusFromPurchase(purchase_try) + purchase_try;
    if (total_try >= total && total_try != total_new) {
      // Show a message even in release build, if user has Javascript console displayed
      console.warn("Inverse calculation for total %f adjusted to: purchase_try %f, total_try %f, from purchase %f, total %f",
	total, purchase_try, total_try, purchase, total_new);
      purchase = purchase_try;
    }
  }

  return purchase;
}

// Each additional refill amount has these properties:
// how much to refill, how many total rides does it get, etc
function RefillAmount(purchaseAmount, bonus, leftover, rides, newBalance) {
  this.purchase = purchaseAmount;
  this.bonus = bonus;
  this.leftover = leftover;
  this.totalAmount = newBalance;
  // These can be computed based on above basic values
  // Here just for ease of use
  this.totalRides = rides; // == totalAmount / gCard.costSingle
}

/**
 * Calculate the refill amount to add rides.
 * This is the heart of the calculator, and tries to mimic how the MTA
 * vending machines may be performing the bonus calculations.
 */
MetroCard.prototype.AddRides = function (add) {
  var totalRides = this.numRides + add;
  var totalAmount = totalRides * this.costSingle;

  var need = totalAmount - this.balance;
  // Special case for no added rides, just calculate current leftover
  if (add < 1) {
    // RefillAmount(purchase, bonus, leftover, totalRides, newBalance);
    return new RefillAmount(0, 0, 0 - need, this.numRides, this.balance);
  }

  // Calculate additional purchase amount
  var purchase = 0;
  if (need < this.bonusMin) {
    purchase = need;
  } else if (need < this.bonusMinTotal) {
    purchase = this.bonusMin;
  } else {
    purchase = this.ComputePurchaseFromTotal(need);
  }
  // Update purchase to be rounded to required nickel or cent
  purchase = roundTo(purchase, this.purchaseRound);

  var bonus = this.ComputeBonusFromPurchase(purchase);

  var amountAdded = purchase + bonus;
  var newBalance = this.balance + amountAdded;
  var leftover = newBalance - totalAmount;

  if (purchase > this.purchaseMax || newBalance > this.balanceMax) {
    return null;
  }

  DEBUG > 2 && console.log("Adding %d rides: Need %f, add %f, total %f, bonus %f, leftover %f",
    add, need, purchase, newBalance, bonus, leftover);
  return new RefillAmount(purchase, bonus, leftover, totalRides, newBalance);
}

///////////////////////////////////////////////////////////////////////////

/**
 * User interface interactions
 */
var gCard = null;
var gUIFields = null;

// Page #index has these UI elements
var gTableId = "#amounts-table"; // HTML id of table to fill in
var gSubmitId = "#submit"; // HTML id of submit button to update table
var gBalanceId = "#balance"; // HTML id of balance input text field
var gVendingId = "#vending-machine-checkbox"; // HTML id for vending checkbox

var gMaxRides = 40; // Maximum number of rides to try to add to card
var gFadeDuration = 1200; // milliseconds to display table blink on update
var gFadeId = gTableId + " thead"; // selector to use for table blink
var gAndroidApp = false; // true if we are running in WebView Android App
var gAppName = "NYCMetroCard"; // should match the string in the Android App

$(document).ready(function() {
  DEBUG && console.log("document ready");
  // Always call bindEvents - we are not using any phone specific APIs here
  // just plain Javascript DOM events
  bindEvents();

  // Check if called as an android app,:
  var userAgent = window.navigator.userAgent;
  gAndroidApp = (userAgent.indexOf(gAppName) >= 0);
  DEBUG && console.log("Is App: " + gAndroidApp + ", got ua " + userAgent);
});

function bindEvents() {
  bindEventsForAll(); // all pages use these events/objects
  if ($("body#index").length > 0) {
    // setup event bindings for the main index.html page
    bindEventsIndexPage();
  }
}

function bindEventsForAll() {
  /* initialization for all pages */
  DEBUG && console.log("init all pages");

  gCard = new MetroCard(0);
  gUIFields = new UIFields();

  // clicking on any a.back link will go back one page in history
  $("a.back").click(function(){
    DEBUG && console.log("Back click");
    parent.history.back();
    return false;
  });
}

// Index page - pagecreate event - sets up the event handlers for all fields.
function bindEventsIndexPage() {
  // These events are only applicable for the index.html page
  DEBUG && console.log("init index page");

  // For multiple events, refresh the table with new calculations.
  // When submit button is clicked:
  $(document).on("click", gSubmitId, updateTableEvent);
  // When user finishes typing in text field and moves out:
  $(document).on("blur", gBalanceId, updateTableEvent); // get "focusout" event.type
  // When vending machine checkbox or label is changed/clicked:
  $(document).on("change", gVendingId, updateTableEvent);
  // When enter key is pressed in text field (form submission),
  // refresh table and prevent further form submission:
  $(document).on("submit", "#form",  updateTableEvent);
  // When page first loads (after all DOM is loaded), restore and refresh table:
  $(window).on("load", restoreUIState);
}

// Update the table with the new refill amounts based on current field values.
function updateTableEvent(event) {
  DEBUG && console.log("Updating Table");
  DEBUG && event && console.log("For event " + event.type);

  // Remove current entries in table
  $(gTableId + " tbody tr").remove();

  // Set card data based on UI fields
  var clearOnZero = true;
  // Since we have no labels, or update button, always clearOnZero.
  // index.html will show value 0 in its placeholder,
  // or use clearOnZero = (event && event.type == "pageshow");
  var balance = getBalance(clearOnZero);
  var vendingIsChecked = $(gVendingId).is(":checked");
  gCard.Update(balance, vendingIsChecked);
  gUIFields.Update(balance, vendingIsChecked);
  gUIFields.SaveState(); // writes to localStorage

  // For each additional ride, calculate the refill amount
  var addData = [];
  for (var i = 0; i < gMaxRides; ++i) {
    var refill = gCard.AddRides(i);
    if (refill) {
      addData.push(refill);
    }
  }

  DEBUG && console.log("Added # entries: " + addData.length);
  // Construct a list of <tr> entries
  var tbody = tableRows(addData);

  // Update the table, "flashing" a part of it off, then on.
  $(gFadeId).fadeTo(0, 0.05); // Dim table display immediately

  $(gTableId).append(tbody);
  // not using jquery mobile $(gTableId).table("refresh"); // jquery mobile needs this for Columns work

  $(gFadeId).fadeTo(gFadeDuration, 1.0); // Turn on table parts, slowly

  // if event is form submit, then prevent normal form submission
  if (event && event.type == "submit") {
    event.preventDefault();
  }
}

// Read the current balance from the page, and return it as a cents amount
// if clearOnZero is true, then a balance of 0 clears the balance field
function getBalance(clearOnZero) {
    var inputVal = $(gBalanceId).val();
    var balance = parseFloat(inputVal);
    DEBUG && console.log("Got balance1 (%s), balance2 (%s)", inputVal, balance);
    // This can only be true if the value is NaN
    // Don't use Number.isNaN since it is unsupported on older browsers.
    var balanceIsNaN = (balance !== balance);
    if (balanceIsNaN) {
      balance = 0;
    }
    var cents = fromDisplay(balance);
    DEBUG && console.log("fromDisplay balance " + cents);
    // See if we need to update the displayed number
    if (clearOnZero && balance == 0) {
      display = "";
    } else {
      display = toDisplay(cents);
    }
    DEBUG && console.log("display (%s), inputVal (%s)", display, inputVal);
    // Always update the input field, don't check if (display != balance)
    // since "if (display != inputVal) " won't work if the browser itself
    // does number validation and returns "" for non-numbers typed in the field.
    $(gBalanceId).val(display); // update the input page field value
    return cents;
}

/* Load values into the page from the localstorage */
function restoreUIState() {
  gUIFields.RestoreState();
  var display = toDisplay(gUIFields.balance);
  $(gBalanceId).val(display); // update the input page field value
  $(gVendingId).prop("checked", gUIFields.vendingMachine);
  updateTableEvent();
}

// Returns a string suitable to enter a table tbody
function tableRows(values, $table) {
  var newrows;
  for (i = 0; i < values.length; ++i) {
    var rdata = values[i];
    newrows += "<tr class=\"" + tableRowClass(rdata) + "\">";
    newrows += "<td class=\"total-rides\">" + rdata.totalRides + "</td>";
    newrows += "<td class=\"add-amount\">" + toDisplay(rdata.purchase) + "</td>";
    newrows += "<td class=\"total-amount\">" + toDisplay(rdata.totalAmount) + "</td>";
    newrows += "<td class=\"bonus-amount\">" + toDisplay(rdata.bonus) + "</td>";
    newrows += "<td class=\"leftover-amount\">" + toDisplay(rdata.leftover) + "</td>";
    newrows += "</tr>";
  }
  return newrows;
}
// Return a class name for the row, based on whether leftover is 0
function tableRowClass(rdata) {
    var cname = "balance";
    var leftover = Math.round(rdata.leftover); // to integer
    if (rdata.purchase <= 0) {
      cname = "add0";
    } else if (leftover <= 5) {
      cname += leftover;
    } else {
      cname += "6"; // leftover can be as high as 29 or so
    }
    return cname;
}

///////////////////////////////////////////////////////////////////////////

function supportsLocalStorage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

/* support storing Javascript objects in localstorage */
Storage.prototype.setObject = function(key, value) {
  this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
  /* returns null if object not present, otherwise JSON.parse value */
  var value = this.getItem(key);
  return value && JSON.parse(value);
}

///////////////////////////////////////////////////////////////////////////

/* Store the value of the fields in localstorage for each use of this page.
 * This is very helpful on mobile devices on a orientation change since
 * it keeps the values of the fields after screen is rotated.
 */

var gKeyPrefix = "com.aczoom.nycmetrocard";
var gUIKeyName = gKeyPrefix + ".ui";

/**
 * User Interface fields
 */
function UIFields() {
  this.Update("0.00", true);
}

UIFields.prototype.Update = function (balance, vendingMachine) {
  this.balance = balance; /* integer, in cents */
  this.vendingMachine = vendingMachine? true : false;
}

UIFields.prototype.SaveState = function () {
  if (!supportsLocalStorage()) { return false; }
  localStorage.setObject(gUIKeyName, this);
  DEBUG && console.log("Save State: " + JSON.stringify(this));
  return true;
}

UIFields.prototype.RestoreState = function () {
  if (!supportsLocalStorage()) { return false; }
  // var restoreUI = localStorage[gUIKeyName];
  var restoreUI = localStorage.getObject(gUIKeyName);
  if (restoreUI) {
    if (restoreUI.balance) {
      this.balance = restoreUI.balance;
    }
    this.vendingMachine = restoreUI.vendingMachine;
  } else {
    DEBUG && console.log("Empty Restore State");
  }

  DEBUG > 1 && console.log("Restore State: " + JSON.stringify(restoreUI));
  DEBUG && console.log("Restore State balance: " + this.balance);
  DEBUG && console.log("Restore State vending: " + this.vendingMachine);

  return true;
}

///////////////////////////////////////////////////////////////////////////
