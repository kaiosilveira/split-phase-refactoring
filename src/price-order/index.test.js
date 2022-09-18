const { priceOrder, applyShipping } = require('.');

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

describe('applyShipping', () => {
  it('should use the discountFee value if the base price is eligible for discounted shipping', () => {
    const quantity = 10;
    const basePrice = 100;
    const discount = 0;
    const priceData = { basePrice, quantity, discount };
    const shippingMethod = { discountThreshold: 1, discountFee: 1, feePerCase: 0 };

    const price = applyShipping(priceData, shippingMethod);

    expect(price).toEqual(110);
  });

  it('should use the feePerCase value if the base price is not eligible for discounted shipping', () => {
    const quantity = 10;
    const basePrice = 100;
    const discount = 0;
    const priceData = { basePrice, quantity, discount };
    const shippingMethod = { discountThreshold: Infinity, discountFee: 0, feePerCase: 1 };

    const price = applyShipping(priceData, shippingMethod);

    expect(price).toEqual(110);
  });
});
