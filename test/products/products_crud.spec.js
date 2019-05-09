const homePage = require("../page_objects/home.page");
const addProductPage = require("../page_objects/add-product.page");
const viewProductPage = require("../page_objects/view-product.page");

// TEST DATA: Import our test data module and the 'jasmine data provider' 'using' command to handle our test data
var using = require("jasmine-data-provider");
var products = require("../data/product-data.module.js");

// TEST DATA: Add a 'describe'
describe("productTests", function() {
  beforeEach(function() {
    browser.get("");
  });

  // TEST DATA: Add your 'using' to use our test data
  using(products.productInfo, function(product, description) {
    it("should create a product" + description, function() {
      // Should be a check that a product doesn't exist here.

      // click add products
      homePage.addProduct.click();

      // fill out form
      // TEST DATA: Update with test data (product)
      addProductPage.productName.sendKeys(product.name);
      addProductPage.productDescription.sendKeys(product.description);
      addProductPage.productPrice.sendKeys(product.price);

      // click submit
      addProductPage.submitButton.click();

      // check product name
      // TEST DATA: Update with test data (product)
      expect(viewProductPage.productName(product).isDisplayed()).toBeTruthy();
    });
  });
});
