[![CI](https://github.com/kaiosilveira/split-phase-refactoring/actions/workflows/ci.yml/badge.svg)](https://github.com/kaiosilveira/split-phase-refactoring/actions/workflows/ci.yml)

ℹ️ _This repository is part of my Refactoring catalog based on Fowler's book with the same title. Please see [kaiosilveira/refactoring](https://github.com/kaiosilveira/refactoring) for more details._

---

# Split Phase

<table>
<thead>
<th>Before</th>
<th>After</th>
</thead>
<tbody>
<tr>
<td>

```javascript
const orderData = orderString.split(/\s+/);
const productPrice = priceList[orderData[0].split('-')[1]];
const orderPrice = parseInt(orderData[1]) * productPrice;
```

</td>

<td>

```javascript
const orderRecord = parseOrder(order);
const orderPrice = price(orderRecord, priceList);

function parseOrder(aString) {
  const values = aString.split(/\s+/);
  return {
    productID: values[0].split('-')[1],
    quantity: parseInt(values[1]),
  };
}

function price(order, priceList) {
  return order.quantity * priceList[order.productID];
}
```

</td>
</tr>
</tbody>
</table>

We often find code that's doing more than one thing. Sometimes in a clear order and with some separation to help readers understand what's going on, some other times, without worrying much. When we come across code like this, we often want to make it more clear and readable so we don't have to load our brain with the full context and can rather focus on specific parts. This refactoring helps deal with these cases.

## Working example

The working example for this refactoring is a function responsible for calculating the total price of an order, taking into account both the discount rules and the shipping details. As the description suggests, it does a few different things without specific separation of concerns, which is a code smell by itself. We aim to create a clear separation of responsibilities when it comes to calculating the base price (considering the applicable discounts) and calculating the shipping.

The initial code for the `priceOrder` function looks like this:

```javascript
function priceOrder(product, quantity, shippingMethod) {
  const basePrice = product.basePrice * quantity;
  const discount =
    Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;

  const shippingPerCase =
    basePrice > shippingMethod.discountThreshold
      ? shippingMethod.discountFee
      : shippingMethod.feePerCase;

  const shippingCost = quantity * shippingPerCase;
  const price = basePrice - discount + shippingCost;
  return price;
}
```

### Test suite

The initial test suite for the `priceOrder` function has tests to cover its various aspects regarding discounts and shipping:

```javascript
describe('priceOrder', () => {
  it('should calculate the base price for an order not eligible for discounts and with free shipping', () => {
    const quantity = 10;
    const product = { basePrice: 10, discountThreshold: Infinity, discountRate: 10 };
    const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 0 };
    const price = priceOrder(product, quantity, shippingMethod);
    expect(price).toEqual(100);
  });

  describe('discounts', () => {
    it('should add a discount of a specified discountRate for every item above the specified discountThreshold', () => {
      const quantity = 10;
      const product = { basePrice: 10, discountThreshold: 1, discountRate: 0.1 };
      const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 0 };
      const price = priceOrder(product, quantity, shippingMethod);
      expect(price).toEqual(91);
    });
  });

  describe('shipping', () => {
    it('should use the discountFee value if the base price is eligible for discounted shipping', () => {
      const quantity = 10;
      const product = { basePrice: 10, discountThreshold: Infinity, discountRate: 0.1 };
      const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };
      const price = priceOrder(product, quantity, shippingMethod);
      expect(price).toEqual(110);
    });

    it('should use the feePerCase value if the base price is not eligible for discounted shipping', () => {
      const quantity = 10;
      const product = { basePrice: 10, discountThreshold: Infinity, discountRate: 0.1 };
      const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };
      const price = priceOrder(product, quantity, shippingMethod);
      expect(price).toEqual(110);
    });
  });
});
```

Individual tests were added for the new `applyShipping` and `calculatePricingData` functions, as detailed in the steps below. The initial test suite described above still remained in place, though, as an extra safety measure.

### Steps

Or first goal is to separate the calculation of the shipping from the calculation of the base price. To do so, we introduce an `applyShipping` function:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -3,6 +3,11 @@ function priceOrder(product, quantity, shippingMethod) {
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;

+  const price = applyShipping(basePrice, shippingMethod, quantity, discount);
+  return price;
+}
+
+function applyShipping(basePrice, shippingMethod, quantity, discount) {
   const shippingPerCase =
     basePrice > shippingMethod.discountThreshold
       ? shippingMethod.discountFee
@@ -13,4 +18,4 @@ function priceOrder(product, quantity, shippingMethod) {
   return price;
 }

-module.exports = { priceOrder };
+module.exports = { priceOrder, applyShipping };

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -1,4 +1,4 @@
-const { priceOrder } = require('.');
+const { priceOrder, applyShipping } = require('.');

 describe('priceOrder', () => {
   it('should calculate the base price for an order not eligible for discounts and with free shipping', () => {
@@ -37,3 +37,27 @@ describe('priceOrder', () => {
     });
   });
 });
+
+describe('applyShipping', () => {
+  it('should use the discountFee value if the base price is eligible for discounted shipping', () => {
+    const quantity = 10;
+    const basePrice = 100;
+    const discount = 0;
+    const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };
+
+    const price = applyShipping(basePrice, shippingMethod, quantity, discount);
+
+    expect(price).toEqual(110);
+  });
+
+  it('should use the feePerCase value if the base price is not eligible for discounted shipping', () => {
+    const quantity = 10;
+    const basePrice = 100;
+    const discount = 0;
+    const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };
+
+    const price = applyShipping(basePrice, shippingMethod, quantity, discount);
+
+    expect(price).toEqual(110);
+  });
+});
```

This function, as the name suggests, receives the base price and some other information about the order and applies the shipping price on top of the base price. Notice how all the variables needed to make the `applyShipping` function work were arbitrarily passed down as arguments. This isn't a big deal for this example as we will be removing all of them one by one in the following steps, using a variation of the [Introduce Parameter Object refactoring](https://github.com/kaiosilveira/introduce-parameter-object-refactoring/tree/ad733d81f3fb6ef5af80082e1f4ad59a771a4593), but would be concerning if it were production code.

Carrying on with the refactoring, we will start migrating the arguments of `applyFunction` to an object. We start by introducing a `priceData` argument to it and updating the callers accordingly:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -2,12 +2,12 @@ function priceOrder(product, quantity, shippingMethod) {
   const basePrice = product.basePrice * quantity;
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
-
-  const price = applyShipping(basePrice, shippingMethod, quantity, discount);
+  const priceData = {};
+  const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
   return price;
 }

-function applyShipping(basePrice, shippingMethod, quantity, discount) {
+function applyShipping(priceData, basePrice, shippingMethod, quantity, discount) {
   const shippingPerCase =
     basePrice > shippingMethod.discountThreshold
       ? shippingMethod.discountFee

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -40,23 +40,25 @@ describe('priceOrder', () => {

 describe('applyShipping', () => {
   it('should use the discountFee value if the base price is eligible for discounted shipping', () => {
+    const priceData = {};
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

-    const price = applyShipping(basePrice, shippingMethod, quantity, discount);
+    const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);

     expect(price).toEqual(110);
   });

   it('should use the feePerCase value if the base price is not eligible for discounted shipping', () => {
+    const priceData = {};
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

-    const price = applyShipping(basePrice, shippingMethod, quantity, discount);
+    const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);

     expect(price).toEqual(110);
   });
```

Then we can start moving the fields. `basePrice` goes first...

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -2,19 +2,19 @@ function priceOrder(product, quantity, shippingMethod) {
   const basePrice = product.basePrice * quantity;
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
-  const priceData = {};
+  const priceData = { basePrice };
   const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
   return price;
 }

 function applyShipping(priceData, basePrice, shippingMethod, quantity, discount) {
   const shippingPerCase =
-    basePrice > shippingMethod.discountThreshold
+    priceData.basePrice > shippingMethod.discountThreshold
       ? shippingMethod.discountFee
       : shippingMethod.feePerCase;

   const shippingCost = quantity * shippingPerCase;
-  const price = basePrice - discount + shippingCost;
+  const price = priceData.basePrice - discount + shippingCost;
   return price;
 }

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -40,10 +40,10 @@ describe('priceOrder', () => {

 describe('applyShipping', () => {
   it('should use the discountFee value if the base price is eligible for discounted shipping', () => {
-    const priceData = {};
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
+    const priceData = { basePrice };
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

     const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
@@ -52,10 +52,10 @@ describe('applyShipping', () => {
   });

   it('should use the feePerCase value if the base price is not eligible for discounted shipping', () => {
-    const priceData = {};
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
+    const priceData = { basePrice };
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

     const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
```

...and can be removed from the argument list now it's no longer needed:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -3,11 +3,11 @@ function priceOrder(product, quantity, shippingMethod) {
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
   const priceData = { basePrice };
-  const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
+  const price = applyShipping(priceData, shippingMethod, quantity, discount);
   return price;
 }

-function applyShipping(priceData, basePrice, shippingMethod, quantity, discount) {
+function applyShipping(priceData, shippingMethod, quantity, discount) {
   const shippingPerCase =
     priceData.basePrice > shippingMethod.discountThreshold
       ? shippingMethod.discountFee

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -46,7 +46,7 @@ describe('applyShipping', () => {
     const priceData = { basePrice };
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

-    const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
+    const price = applyShipping(priceData, shippingMethod, quantity, discount);

     expect(price).toEqual(110);
   });
@@ -58,7 +58,7 @@ describe('applyShipping', () => {
     const priceData = { basePrice };
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

-    const price = applyShipping(priceData, basePrice, shippingMethod, quantity, discount);
+    const price = applyShipping(priceData, shippingMethod, quantity, discount);

     expect(price).toEqual(110);
   });
```

Same thing for the `quantity` information...

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -2,7 +2,7 @@ function priceOrder(product, quantity, shippingMethod) {
   const basePrice = product.basePrice * quantity;
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
-  const priceData = { basePrice };
+  const priceData = { basePrice, quantity };
   const price = applyShipping(priceData, shippingMethod, quantity, discount);
   return price;
 }
@@ -13,7 +13,7 @@ function applyShipping(priceData, shippingMethod, quantity, discount) {
       ? shippingMethod.discountFee
       : shippingMethod.feePerCase;

-  const shippingCost = quantity * shippingPerCase;
+  const shippingCost = priceData.quantity * shippingPerCase;
   const price = priceData.basePrice - discount + shippingCost;
   return price;
 }

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -43,7 +43,7 @@ describe('applyShipping', () => {
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
-    const priceData = { basePrice };
+    const priceData = { basePrice, quantity };
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

     const price = applyShipping(priceData, shippingMethod, quantity, discount);
@@ -55,7 +55,7 @@ describe('applyShipping', () => {
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
-    const priceData = { basePrice };
+    const priceData = { basePrice, quantity };
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

     const price = applyShipping(priceData, shippingMethod, quantity, discount);
```

...and its remotion:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -3,11 +3,11 @@ function priceOrder(product, quantity, shippingMethod) {
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
   const priceData = { basePrice, quantity };
-  const price = applyShipping(priceData, shippingMethod, quantity, discount);
+  const price = applyShipping(priceData, shippingMethod, discount);
   return price;
 }

-function applyShipping(priceData, shippingMethod, quantity, discount) {
+function applyShipping(priceData, shippingMethod, discount) {
   const shippingPerCase =
     priceData.basePrice > shippingMethod.discountThreshold
       ? shippingMethod.discountFee

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -46,7 +46,7 @@ describe('applyShipping', () => {
     const priceData = { basePrice, quantity };
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

-    const price = applyShipping(priceData, shippingMethod, quantity, discount);
+    const price = applyShipping(priceData, shippingMethod, discount);

     expect(price).toEqual(110);
   });
@@ -58,7 +58,7 @@ describe('applyShipping', () => {
     const priceData = { basePrice, quantity };
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

-    const price = applyShipping(priceData, shippingMethod, quantity, discount);
+    const price = applyShipping(priceData, shippingMethod, discount);

     expect(price).toEqual(110);
   });
```

And, last but not least, the `discount` information...

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -2,7 +2,7 @@ function priceOrder(product, quantity, shippingMethod) {
   const basePrice = product.basePrice * quantity;
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
-  const priceData = { basePrice, quantity };
+  const priceData = { basePrice, quantity, discount };
   const price = applyShipping(priceData, shippingMethod, discount);
   return price;
 }
@@ -14,7 +14,7 @@ function applyShipping(priceData, shippingMethod, discount) {
       : shippingMethod.feePerCase;

   const shippingCost = priceData.quantity * shippingPerCase;
-  const price = priceData.basePrice - discount + shippingCost;
+  const price = priceData.basePrice - priceData.discount + shippingCost;
   return price;
 }

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -43,7 +43,7 @@ describe('applyShipping', () => {
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
-    const priceData = { basePrice, quantity };
+    const priceData = { basePrice, quantity, discount };
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

     const price = applyShipping(priceData, shippingMethod, discount);
@@ -55,7 +55,7 @@ describe('applyShipping', () => {
     const quantity = 10;
     const basePrice = 100;
     const discount = 0;
-    const priceData = { basePrice, quantity };
+    const priceData = { basePrice, quantity, discount };
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

     const price = applyShipping(priceData, shippingMethod, discount);
```

...and it's remotion from the parameter list:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -3,11 +3,11 @@ function priceOrder(product, quantity, shippingMethod) {
   const discount =
     Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
   const priceData = { basePrice, quantity, discount };
-  const price = applyShipping(priceData, shippingMethod, discount);
+  const price = applyShipping(priceData, shippingMethod);
   return price;
 }

-function applyShipping(priceData, shippingMethod, discount) {
+function applyShipping(priceData, shippingMethod) {
   const shippingPerCase =
     priceData.basePrice > shippingMethod.discountThreshold
       ? shippingMethod.discountFee

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -46,7 +46,7 @@ describe('applyShipping', () => {
     const priceData = { basePrice, quantity, discount };
     const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

-    const price = applyShipping(priceData, shippingMethod, discount);
+    const price = applyShipping(priceData, shippingMethod);

     expect(price).toEqual(110);
   });
@@ -58,7 +58,7 @@ describe('applyShipping', () => {
     const priceData = { basePrice, quantity, discount };
     const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

-    const price = applyShipping(priceData, shippingMethod, discount);
+    const price = applyShipping(priceData, shippingMethod);

     expect(price).toEqual(110);
   });
```

Now that we have the shipping calculation out of the main `priceOrder` function, we can start isolating the computation of the base price + discount part, which we can easily accomplish by moving this computation into its own separate function:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -1,8 +1,5 @@
 function priceOrder(product, quantity, shippingMethod) {
-  const basePrice = product.basePrice * quantity;
-  const discount =
-    Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
-  const priceData = { basePrice, quantity, discount };
+  const priceData = calculatePricingData(product, quantity);
   const price = applyShipping(priceData, shippingMethod);
   return price;
 }
@@ -18,4 +15,12 @@ function applyShipping(priceData, shippingMethod) {
   return price;
 }

-module.exports = { priceOrder, applyShipping };
+function calculatePricingData(product, quantity) {
+  const basePrice = product.basePrice * quantity;
+  const discount =
+    Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate;
+
+  return { basePrice, quantity, discount };
+}
+
+module.exports = { priceOrder, applyShipping, calculatePricingData };

diff --git a/src/price-order/index.test.js b/src/price-order/index.test.js
@@ -1,4 +1,4 @@
-const { priceOrder, applyShipping } = require('.');
+const { priceOrder, applyShipping, calculatePricingData } = require('.');

 describe('priceOrder', () => {
   it('should calculate the base price for an order not eligible for discounts and with free shipping', () => {
@@ -63,3 +63,27 @@ describe('applyShipping', () => {
     expect(price).toEqual(110);
   });
 });
+
+describe('calculatePricingData', () => {
+  it('should calculate the pricing data for an order not eligible for discounts and with free shipping', () => {
+    const quantity = 10;
+    const product = { basePrice: 10, discountThreshold: Infinity, discountRate: 10 };
+
+    const priceData = calculatePricingData(product, quantity);
+
+    expect(priceData.basePrice).toEqual(100);
+    expect(priceData.quantity).toEqual(quantity);
+    expect(priceData.discount).toEqual(0);
+  });
+
+  it('should add a discount of a specified discountRate for every item above the specified discountThreshold', () => {
+    const quantity = 10;
+    const product = { basePrice: 10, discountThreshold: 9, discountRate: 0.1 };
+
+    const priceData = calculatePricingData(product, quantity);
+
+    expect(priceData.basePrice).toEqual(100);
+    expect(priceData.quantity).toEqual(quantity);
+    expect(priceData.discount).toEqual(1);
+  });
+});
```

Now, the `priceOrder` function is short and precise.

Two small details before we finish: Let's remove the temp `price` variable, as it's being created only to be returned. First, we update the `priceOrder` function...

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -1,7 +1,6 @@
 function priceOrder(product, quantity, shippingMethod) {
   const priceData = calculatePricingData(product, quantity);
-  const price = applyShipping(priceData, shippingMethod);
-  return price;
+  return applyShipping(priceData, shippingMethod);
 }

 function applyShipping(priceData, shippingMethod) {
```

...and then we update `applyShipping`:

```diff
diff --git a/src/price-order/index.js b/src/price-order/index.js
@@ -10,8 +10,7 @@ function applyShipping(priceData, shippingMethod) {
       : shippingMethod.feePerCase;

   const shippingCost = priceData.quantity * shippingPerCase;
-  const price = priceData.basePrice - priceData.discount + shippingCost;
-  return price;
+  return priceData.basePrice - priceData.discount + shippingCost;
 }

 function calculatePricingData(product, quantity) {
```

And that's it! Notice how the `priceOrder` function now has two clear phases: calculating the base price data and then applying the shipping price to it.

### Commit history

Below there's the commit history for the steps detailed above.

| Commit SHA                                                                                                         | Message                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [ff2b2bb](https://github.com/kaiosilveira/split-phase-refactoring/commit/ff2b2bb4696c8368b3717ceeaefd624a3bb7891a) | introduce applyShipping function                                              |
| [abebb04](https://github.com/kaiosilveira/split-phase-refactoring/commit/abebb048297b2537faeb13d25adfa3ccd54eb4b9) | add priceData argument to applyShipping and update callers accordingly        |
| [1e30332](https://github.com/kaiosilveira/split-phase-refactoring/commit/1e303326d0af538792a72242c91486751c0a1798) | add basePrice information to the priceData object and use it at applyShipping |
| [7b3ff49](https://github.com/kaiosilveira/split-phase-refactoring/commit/7b3ff49c3d2f1502a00f935ef74cf6443e7a654e) | remove basePrice from applyShipping's parameter list                          |
| [2379a08](https://github.com/kaiosilveira/split-phase-refactoring/commit/2379a086a56d9462bc94a3244cf8a189eec54bc6) | add quantity information to priceData object and use it at applyShipping      |
| [9c85179](https://github.com/kaiosilveira/split-phase-refactoring/commit/9c851796f03f5ab4ad5c543cac149015b31a0cd8) | remove quantity from applyShipping's parameter list                           |
| [966c584](https://github.com/kaiosilveira/split-phase-refactoring/commit/966c584b77aa4b363f9183566a48cb481c925df5) | add discount information to the priceData object and use it at applyShipping  |
| [41c8aa2](https://github.com/kaiosilveira/split-phase-refactoring/commit/41c8aa2451817b3f7be6dc218a0efe4bbbb2f59d) | remove discount from applyShipping's parameter list                           |
| [e829493](https://github.com/kaiosilveira/split-phase-refactoring/commit/e8294931812365a008ee8814f4efc6e4fada4bc4) | move pricing data computation into its own function                           |
| [fcdfe07](https://github.com/kaiosilveira/split-phase-refactoring/commit/fcdfe0788abce3976d8fd64709f96d4e7afc60d3) | tidy out price const at priceOrder                                            |
| [2b06b17](https://github.com/kaiosilveira/split-phase-refactoring/commit/2b06b170db4dee2a7e3e2e7d2678c0e28add8e06) | tidy out price const at applyShipping                                         |

For the full commit history for this project, check the [Commit History tab](https://github.com/kaiosilveira/split-phase-refactoring/commits/main).
