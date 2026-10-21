import { Routes } from '@angular/router';
import { ListPage } from './features/basket/ui/list-page';
import { ProductPage } from './features/product/ui/product-page';
import { SearchPage } from './features/search/ui/search-page';

export const routes: Routes = [
  { path: '', component: SearchPage },
  { path: 'products/:id', component: ProductPage },
  { path: 'list', component: ListPage },
  { path: '**', redirectTo: '' },
];
